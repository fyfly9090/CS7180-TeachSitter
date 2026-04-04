// PATCH  /api/children/[id] — Parent updates one of their children.
// DELETE /api/children/[id] — Parent removes one of their children.
// Ownership is verified before mutation (RLS also enforces this server-side).

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createChildSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";

export const PATCH = withApiHandler(async (req: Request, ctx: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  const body = await req.json();
  const input = createChildSchema.parse(body);

  const { data, error } = await supabase
    .from("children")
    .update({
      name: input.name,
      classroom: input.classroom,
      age: input.age,
      notes: input.notes,
    })
    .eq("id", id)
    .eq("parent_id", user.id)
    .select("id, name, classroom, age, notes, created_at")
    .single();

  if (error || !data) throw errors.notFound("Child");

  return NextResponse.json({ child: data });
});

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
