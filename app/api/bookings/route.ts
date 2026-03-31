// GET /api/bookings — Parent fetches their booking history with teacher info.
// POST /api/bookings — Parent creates a booking request for a teacher.
// Checks teacher availability for the requested dates before inserting.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createBookingSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import type { BookingResponse } from "@/types";

export const GET = withApiHandler(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, teacher_id, start_date, end_date, status, message, created_at, teachers(full_name, classroom)"
    )
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw errors.internal();

  type BookingRow = {
    id: string;
    teacher_id: string;
    start_date: string;
    end_date: string;
    status: string;
    message: string | null;
    created_at: string;
    teachers: { full_name: string | null; classroom: string } | null;
  };
  const rows = (data ?? []) as BookingRow[];

  // Batch-fetch availability times for all relevant teachers
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id))];
  const { data: availRows } = teacherIds.length
    ? await supabase
        .from("availability")
        .select("teacher_id, start_date, end_date, start_time, end_time")
        .in("teacher_id", teacherIds)
    : { data: [] };

  const bookings = rows.map((row) => {
    const teacher = row.teachers as { full_name: string | null; classroom: string } | null;
    // Find availability slot that fully covers the booking date range
    const avail = (availRows ?? []).find(
      (a) =>
        a.teacher_id === row.teacher_id &&
        a.start_date <= row.start_date &&
        a.end_date >= row.end_date
    ) as { start_time: string | null; end_time: string | null } | undefined;
    return {
      id: row.id,
      teacher_id: row.teacher_id,
      teacher_name: teacher?.full_name ?? null,
      teacher_classroom: teacher?.classroom ?? null,
      start_date: row.start_date,
      end_date: row.end_date,
      start_time: avail?.start_time ?? null,
      end_time: avail?.end_time ?? null,
      status: row.status,
      message: row.message,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ bookings });
});

export const POST = withApiHandler(async (req: Request) => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  const body = await req.json();
  const input = createBookingSchema.parse(body);

  // Check teacher has an availability slot covering the requested dates
  const { data: slots, error: availError } = await supabase
    .from("availability")
    .select("id")
    .eq("teacher_id", input.teacher_id)
    .eq("is_booked", false)
    .lte("start_date", input.start_date)
    .gte("end_date", input.end_date);

  if (availError) throw errors.internal();
  if (!slots || slots.length === 0) {
    throw errors.conflict("Teacher unavailable for requested dates");
  }

  // Insert booking with status pending
  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      parent_id: user.id,
      teacher_id: input.teacher_id,
      start_date: input.start_date,
      end_date: input.end_date,
      status: "pending",
      message: input.message ?? null,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  const { id, parent_id, teacher_id, start_date, end_date, status } = booking as BookingResponse;
  return NextResponse.json(
    { booking: { id, parent_id, teacher_id, start_date, end_date, status } },
    { status: 201 }
  );
});
