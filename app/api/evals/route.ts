// GET /api/evals — Retrieve historical AI match eval records (admin only).
// Supports pagination via limit and offset query params.

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { evalsQuerySchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";

export const GET = withApiHandler(async (req: Request) => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "admin") throw errors.forbidden();

  const { searchParams } = new URL(req.url);
  const { limit, offset } = evalsQuerySchema.parse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  const { data, error, count } = await supabase
    .from("match_evals")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw errors.internal();

  return NextResponse.json({ evals: data ?? [], total: count ?? 0 });
});
