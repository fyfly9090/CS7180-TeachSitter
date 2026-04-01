// PATCH /api/bookings/[id] — Teacher confirms or declines a booking request.
// Verifies the authenticated teacher owns the booking before updating.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { updateBookingSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";

export const PATCH = withApiHandler(async (req: Request, ctx: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "teacher") throw errors.forbidden();

  const body = await req.json();
  const { status } = updateBookingSchema.parse(body);

  // Look up the teacher record for this user
  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (teacherError || !teacher) throw errors.notFound("Teacher profile");

  // Fetch the booking (include dates for availability side-effect)
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, teacher_id, status, start_date, end_date")
    .eq("id", id)
    .single();

  if (bookingError || !booking) throw errors.notFound("Booking");

  const typedBooking = booking as {
    id: string;
    teacher_id: string;
    status: string;
    start_date: string;
    end_date: string;
  };
  const typedTeacher = teacher as { id: string };

  // Verify ownership
  if (typedBooking.teacher_id !== typedTeacher.id) {
    throw errors.forbidden();
  }

  // Only pending bookings can be confirmed or declined
  if (typedBooking.status !== "pending") {
    throw errors.conflict(`Booking is already ${typedBooking.status}`);
  }

  // Update status
  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (updateError || !updated) throw errors.internal();

  // Side effect: mark availability as booked when confirmed
  if (status === "confirmed") {
    await supabase
      .from("availability")
      .update({ is_booked: true })
      .eq("teacher_id", typedBooking.teacher_id)
      .lte("start_date", typedBooking.start_date)
      .gte("end_date", typedBooking.end_date);
  }

  return NextResponse.json({ booking: updated });
});
