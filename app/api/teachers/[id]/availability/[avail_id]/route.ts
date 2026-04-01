// DELETE /api/teachers/[id]/availability/[avail_id] — Remove a single availability block.
// Auth: teacher role only. Ownership verified. Cannot delete booked blocks (409).

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { uuidParamSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import type { Teacher } from "@/types";

export const DELETE = withApiHandler(async (_req: Request, ctx: unknown) => {
  const { id, avail_id } = await (ctx as { params: Promise<{ id: string; avail_id: string }> })
    .params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "teacher") throw errors.forbidden();

  // Verify ownership
  const { data: ownRow, error: lookupError } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (lookupError || !ownRow) throw errors.notFound("Teacher profile");
  if ((ownRow as unknown as Pick<Teacher, "id">).id !== id) throw errors.forbidden();

  // Validate avail_id format
  uuidParamSchema.parse(avail_id);

  // Fetch the availability row
  const { data: avail, error: fetchError } = await supabase
    .from("availability")
    .select("id, teacher_id, is_booked")
    .eq("id", avail_id)
    .single();

  if (fetchError || !avail) throw errors.notFound("Availability block");

  const row = avail as unknown as {
    id: string;
    teacher_id: string;
    is_booked: boolean;
  };

  // Verify the block belongs to this teacher
  if (row.teacher_id !== id) throw errors.notFound("Availability block");

  // Cannot delete booked blocks
  if (row.is_booked) throw errors.conflict("Cannot delete booked availability");

  // Delete
  const { error: deleteError } = await supabase.from("availability").delete().eq("id", avail_id);

  if (deleteError) throw errors.internal();

  return new NextResponse(null, { status: 204 });
});
