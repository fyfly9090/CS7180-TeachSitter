// PATCH /api/bookings/[id] — Teacher confirms or declines a booking request.
// Verifies the authenticated teacher owns the booking before updating.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { updateBookingSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import type { Booking, Teacher } from "@/types";

export const PATCH = withApiHandler(
  async (req: Request, ctx: unknown) => {
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

    // Fetch the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, teacher_id, status")
      .eq("id", id)
      .single();

    if (bookingError || !booking) throw errors.notFound("Booking");

    // Verify ownership
    if ((booking as Pick<Booking, "id" | "teacher_id" | "status">).teacher_id !== (teacher as Pick<Teacher, "id">).id) {
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
);
