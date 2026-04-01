// GET /api/teachers/me/bookings — Returns the authenticated teacher's bookings
// split into confirmed and pending lists. Pending bookings are enriched with
// parent email + display name via the service client (bypasses RLS on profiles).

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { emailToDisplayName } from "@/lib/utils/format";
import type { Teacher, Booking, BookingWithParent } from "@/types";

export const GET = withApiHandler(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "teacher") throw errors.forbidden();

  // Fetch teacher row for the calling user
  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (teacherError || !teacher) throw errors.notFound("Teacher profile");

  const teacherId = (teacher as unknown as Pick<Teacher, "id">).id;

  // Fetch all bookings for this teacher (RLS enforces ownership)
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("start_date", { ascending: true });

  if (bookingsError) throw errors.internal();

  const allBookings = (bookings ?? []) as unknown as Booking[];
  const confirmed = allBookings.filter((b) => b.status === "confirmed");
  const pendingRaw = allBookings.filter((b) => b.status === "pending");

  // Enrich pending bookings with parent email via service client (bypasses RLS)
  let pending: BookingWithParent[] = [];
  if (pendingRaw.length > 0) {
    const parentIds = [...new Set(pendingRaw.map((b) => b.parent_id))];
    const serviceClient = createServiceClient();
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, email")
      .in("id", parentIds);

    const profileMap = new Map<string, string>();
    if (profiles) {
      for (const p of profiles as unknown as { id: string; email: string }[]) {
        profileMap.set(p.id, p.email);
      }
    }

    pending = pendingRaw.map((b) => {
      const email = profileMap.get(b.parent_id) ?? "";
      return {
        ...b,
        parent_email: email,
        parent_display_name: email ? emailToDisplayName(email) : "Parent",
      };
    });
  }

  return NextResponse.json({ confirmed, pending });
});
