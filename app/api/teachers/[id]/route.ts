// GET /api/teachers/[id] — Fetch a teacher's profile and availability.
// Any authenticated user can call this endpoint.
// RLS automatically filters availability: parents see unbooked slots only;
// the owning teacher sees all their slots.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid teacher ID");

export const GET = withApiHandler(async (_req: Request, ctx: unknown) => {
  const { params } = ctx as { params: Promise<{ id: string }> };
  const { id } = await params;

  // Validate UUID
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw errors.invalidInput("Invalid teacher ID");

  // Auth: any authenticated user
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw errors.unauthorized();

  // Fetch teacher profile
  const service = createServiceClient();
  const { data: teacher, error: teacherError } = await service
    .from("teachers")
    .select(
      "id, user_id, classroom, bio, hourly_rate, full_name, position, created_at, profiles!inner(email)"
    )
    .eq("id", parsed.data)
    .single();

  if (teacherError || !teacher) throw errors.notFound("Teacher");

  // Fetch availability (unbooked only for parents; all for the owning teacher)
  const isOwner = teacher.user_id === user.id;
  let availQuery = service
    .from("availability")
    .select("id, start_date, end_date, start_time, end_time, is_booked, created_at")
    .eq("teacher_id", parsed.data)
    .order("start_date", { ascending: true });
  if (!isOwner) availQuery = availQuery.eq("is_booked", false);

  const { data: availability, error: availError } = await availQuery;
  if (availError) throw errors.internal();

  const row = teacher as typeof teacher & { profiles: { email: string } };

  return NextResponse.json({
    teacher: {
      id: row.id,
      classroom: row.classroom,
      bio: row.bio,
      hourly_rate: (row as { hourly_rate?: number | null }).hourly_rate ?? null,
      full_name: (row as { full_name?: string | null }).full_name ?? null,
      position: (row as { position?: string | null }).position ?? null,
      name: row.profiles.email,
    },
    availability: availability ?? [],
  });
});
