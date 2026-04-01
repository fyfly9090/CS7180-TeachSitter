// DELETE /api/children/[id] — Parent removes one of their children.
// Ownership is verified before delete (RLS also enforces this server-side).

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createServerClient } from "@/lib/supabase/server";

export const DELETE = withApiHandler(async (_req: Request, ctx: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  // Verify ownership before deleting (belt-and-suspenders on top of RLS)
  const { data: child, error: fetchError } = await supabase
    .from("children")
    .select("id, parent_id")
    .eq("id", id)
    .eq("parent_id", user.id)
    .single();

  if (fetchError || !child) throw errors.notFound("Child");

  const { error: deleteError } = await supabase.from("children").delete().eq("id", id);

  if (deleteError) throw errors.internal();

  return new NextResponse(null, { status: 204 });
});
