// POST /api/teachers/[id]/availability — Add a single availability block.
// Auth: teacher role only. Ownership verified: [id] must match the caller's teacher row.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { availabilityBlockSchema, uuidParamSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import type { Teacher, Availability } from "@/types";

export const POST = withApiHandler(async (req: Request, ctx: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  uuidParamSchema.parse(id);

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "teacher") throw errors.forbidden();

  const body = await req.json();
  const input = availabilityBlockSchema.parse(body);

  // Verify ownership
  const { data: ownRow, error: lookupError } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (lookupError || !ownRow) throw errors.notFound("Teacher profile");
  if ((ownRow as unknown as Pick<Teacher, "id">).id !== id) throw errors.forbidden();

  // Insert availability block
  const { data: created, error: insertError } = await supabase
    .from("availability")
    .insert({
      teacher_id: id,
      start_date: input.start_date,
      end_date: input.end_date,
      start_time: null,
      end_time: null,
      is_booked: false,
    })
    .select()
    .single();

  if (insertError || !created) throw errors.internal();

  return NextResponse.json({ availability: created as unknown as Availability }, { status: 201 });
});
