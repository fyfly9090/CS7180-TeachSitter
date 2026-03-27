// POST /api/bookings — Parent creates a booking request for a teacher.
// Checks teacher availability for the requested dates before inserting.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createBookingSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import type { BookingResponse } from "@/types";

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
