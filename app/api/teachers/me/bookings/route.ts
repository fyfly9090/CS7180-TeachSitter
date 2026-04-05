// GET /api/teachers/me/bookings — Returns the authenticated teacher's bookings
// split into confirmed and pending lists. Both are enriched with parent email +
// display name via the service client (bypasses RLS on profiles).

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { emailToDisplayName } from "@/lib/utils/format";
import type { Teacher, Booking, BookingWithParent } from "@/types";

function enrichBookings(
  bookings: Booking[],
  profileMap: Map<string, { email: string; full_name: string | null }>,
  childrenMap: Map<string, { classroom: string; age: number }[]>
): BookingWithParent[] {
  return bookings.map((b) => {
    const profile = profileMap.get(b.parent_id);
    const email = profile?.email ?? "";
    const displayName = profile?.full_name || (email ? emailToDisplayName(email) : "Parent");
    return {
      ...b,
      parent_email: email,
      parent_display_name: displayName,
      children: childrenMap.get(b.parent_id) ?? [],
    };
  });
}

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
  const confirmedRaw = allBookings.filter((b) => b.status === "confirmed");
  const pendingRaw = allBookings.filter((b) => b.status === "pending");

  // Enrich all bookings with parent email via service client (bypasses RLS)
  const allParentIds = [...new Set(allBookings.map((b) => b.parent_id))];
  const profileMap = new Map<string, { email: string; full_name: string | null }>();

  if (allParentIds.length > 0) {
    const serviceClient = createServiceClient();
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, email, full_name")
      .in("id", allParentIds);

    if (profiles) {
      for (const p of profiles as unknown as {
        id: string;
        email: string;
        full_name: string | null;
      }[]) {
        profileMap.set(p.id, { email: p.email, full_name: p.full_name });
      }
    }
  }

  // Fetch children for each parent (service client bypasses RLS)
  const childrenMap = new Map<string, { classroom: string; age: number }[]>();

  if (allParentIds.length > 0) {
    const serviceClient = createServiceClient();
    const { data: children } = await serviceClient
      .from("children")
      .select("parent_id, classroom, age")
      .in("parent_id", allParentIds);

    if (children) {
      for (const c of children as unknown as {
        parent_id: string;
        classroom: string;
        age: number;
      }[]) {
        const existing = childrenMap.get(c.parent_id) ?? [];
        existing.push({ classroom: c.classroom, age: c.age });
        childrenMap.set(c.parent_id, existing);
      }
    }
  }

  return NextResponse.json({
    confirmed: enrichBookings(confirmedRaw, profileMap, childrenMap),
    pending: enrichBookings(pendingRaw, profileMap, childrenMap),
  });
});
