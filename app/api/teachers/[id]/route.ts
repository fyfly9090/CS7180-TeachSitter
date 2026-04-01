// GET /api/teachers/[id] — Any authenticated user reads teacher profile + availability.
// RLS handles visibility: parents see unbooked only; the owning teacher sees all.
//
// PATCH /api/teachers/[id] — Teacher updates their own profile (classroom, bio, expertise).
// Auth: teacher role only. Ownership verified: [id] must match the caller's teacher row.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { updateTeacherProfileSchema, uuidParamSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import type { Teacher, Availability } from "@/types";

// ---------------------------------------------------------------------------
// GET /api/teachers/[id]
// ---------------------------------------------------------------------------

export const GET = withApiHandler(async (_req: Request, ctx: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  uuidParamSchema.parse(id);

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .single();

  if (teacherError || !teacher) throw errors.notFound("Teacher profile");

  const { data: availability, error: availError } = await supabase
    .from("availability")
    .select("id, teacher_id, start_date, end_date, start_time, end_time, is_booked, created_at")
    .eq("teacher_id", id)
    .order("start_date", { ascending: true });

  if (availError) throw errors.internal();

  return NextResponse.json({
    teacher: teacher as unknown as Teacher,
    availability: (availability ?? []) as unknown as Availability[],
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/teachers/[id]
// ---------------------------------------------------------------------------

export const PATCH = withApiHandler(async (req: Request, ctx: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "teacher") throw errors.forbidden();

  const body = await req.json();
  const input = updateTeacherProfileSchema.parse(body);

  // Verify ownership: fetch teacher row belonging to the calling user
  const { data: ownRow, error: lookupError } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (lookupError || !ownRow) throw errors.notFound("Teacher profile not found");
  if ((ownRow as unknown as Pick<Teacher, "id">).id !== id) throw errors.forbidden();

  // Update teacher profile
  const { data: updated, error: updateError } = await supabase
    .from("teachers")
    .update({
      classroom: input.classroom,
      bio: input.bio,
      expertise: input.expertise ?? [],
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updated) throw errors.internal();

  // Replace availability if provided (delete unbooked rows, then insert new ones)
  if (input.availability !== undefined) {
    const { error: deleteError } = await supabase
      .from("availability")
      .delete()
      .eq("teacher_id", id)
      .eq("is_booked", false);

    if (deleteError) throw errors.internal();

    if (input.availability.length > 0) {
      const { error: insertError } = await supabase.from("availability").insert(
        input.availability.map((block) => ({
          teacher_id: id,
          start_date: block.start_date,
          end_date: block.end_date,
          start_time: null,
          end_time: null,
          is_booked: false,
        }))
      );

      if (insertError) throw errors.internal();
    }
  }

  return NextResponse.json({ teacher: updated as unknown as Teacher });
});
