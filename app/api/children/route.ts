// GET /api/children  — Parent fetches their own children.
// POST /api/children — Parent adds a new child.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { createChildSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";

export const GET = withApiHandler(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  const { data, error } = await supabase
    .from("children")
    .select("id, name, classroom, age, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw errors.internal();

  return NextResponse.json({ children: data ?? [] });
});

export const POST = withApiHandler(async (req: Request) => {
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
    .insert({
      parent_id: user.id,
      name: input.name,
      classroom: input.classroom,
      age: input.age,
    })
    .select("id, name, classroom, age, created_at")
    .single();

  if (error) throw errors.internal();

  return NextResponse.json({ child: data }, { status: 201 });
});
