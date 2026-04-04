// GET /api/teachers/me — Returns the authenticated teacher's profile + availability.
// Used by the teacher setup page to load existing data on mount.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";
import type { Teacher, Availability } from "@/types";

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
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (teacherError || !teacher) {
    // New teacher — auto-create a teacher row so setup page can save
    const fullName = (user.user_metadata.full_name as string) || "";
    const { data: newTeacher, error: createError } = await supabase
      .from("teachers")
      .insert({
        user_id: user.id,
        classroom: "",
        bio: "",
        full_name: fullName || null,
      })
      .select()
      .single();

    if (createError || !newTeacher) {
      // Insert failed — maybe RLS or constraint; return gracefully
      return NextResponse.json({
        teacher: null,
        availability: [],
        user_name: fullName || "Teacher",
      });
    }

    return NextResponse.json({
      teacher: newTeacher as unknown as Teacher,
      availability: [],
      user_name: fullName || "Teacher",
    });
  }

  // Fetch availability rows for this teacher
  const { data: availability, error: availError } = await supabase
    .from("availability")
    .select("id, teacher_id, start_date, end_date, start_time, end_time, is_booked, created_at")
    .eq("teacher_id", (teacher as unknown as Teacher).id)
    .order("start_date", { ascending: true });

  if (availError) throw errors.internal();

  return NextResponse.json({
    teacher: teacher as unknown as Teacher,
    availability: (availability ?? []) as unknown as Availability[],
  });
});
