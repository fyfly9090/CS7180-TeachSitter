// PATCH /api/bookings/[id]
//   Teacher: confirm or decline a booking request.
//   Parent: update booking dates + reset status to pending.
// DELETE /api/bookings/[id] — Parent cancels a pending booking.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { updateBookingSchema, updateBookingDatesSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";

export const PATCH = withApiHandler(async (req: Request, ctx: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();

  const role = user.user_metadata.role as string;
  const body = await req.json();

  // ── Teacher: confirm / decline ────────────────────────────────────────────
  if (role === "teacher") {
    const { status } = updateBookingSchema.parse(body);

    // Look up the teacher record for this user
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (teacherError || !teacher) throw errors.notFound("Teacher profile");

    // Fetch the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, teacher_id, status")
      .eq("id", id)
      .single();

    if (bookingError || !booking) throw errors.notFound("Booking");

    // Verify ownership
    if ((booking as { teacher_id: string }).teacher_id !== (teacher as { id: string }).id) {
      throw errors.forbidden();
    }

    // Update status
    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select("id, status")
      .single();

    if (updateError || !updated) throw errors.internal();

    return NextResponse.json({ booking: updated });
  }

  // ── Parent: modify dates ──────────────────────────────────────────────────
  if (role === "parent") {
    const input = updateBookingDatesSchema.parse(body);

    // Fetch the booking and verify parent owns it
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, parent_id, teacher_id")
      .eq("id", id)
      .single();

    if (bookingError || !booking) throw errors.notFound("Booking");

    const b = booking as { parent_id: string; teacher_id: string };
    if (b.parent_id !== user.id) throw errors.forbidden();

    // Check teacher still has availability covering the new dates
    const { data: slots, error: availError } = await supabase
      .from("availability")
      .select("id")
      .eq("teacher_id", b.teacher_id)
      .eq("is_booked", false)
      .lte("start_date", input.start_date)
      .gte("end_date", input.end_date);

    if (availError) throw errors.internal();
    if (!slots || slots.length === 0) {
      throw errors.conflict("Teacher unavailable for requested dates");
    }

    // Update dates + reset to pending
    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({
        start_date: input.start_date,
        end_date: input.end_date,
        status: "pending",
        message: input.message ?? null,
      })
      .eq("id", id)
      .select("id, parent_id, teacher_id, start_date, end_date, status")
      .single();

    if (updateError || !updated) throw errors.internal();

    return NextResponse.json({ booking: updated });
  }

  throw errors.forbidden();
});

export const DELETE = withApiHandler(async (_req: Request, ctx: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  // Fetch the booking (include dates for availability side-effect)
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, parent_id, status")
    .eq("id", id)
    .single();

  if (bookingError || !booking) throw errors.notFound("Booking");

  const b = booking as { parent_id: string; status: string };
  if (b.parent_id !== user.id) throw errors.forbidden();
  if (b.status !== "pending") throw errors.conflict("Only pending bookings can be cancelled");

  const { error: deleteError } = await supabase.from("bookings").delete().eq("id", id);

  if (deleteError) throw errors.internal();

  return new NextResponse(null, { status: 204 });
});
