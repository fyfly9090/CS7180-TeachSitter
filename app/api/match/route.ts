// POST /api/match — AI-powered teacher ranking.
// Runs Gemini 1.5 Pro and Claude 3.5 Sonnet in parallel; first response wins.
// Logs all inputs/outputs to match_evals. LLM-as-judge scores async (0-10).

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { matchRequestSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import { runMatch } from "@/lib/api/match";

export const POST = withApiHandler(async (req: Request) => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  const body = await req.json();
  const input = matchRequestSchema.parse(body);

  const { ranked_teachers, eval_id } = await runMatch(input, supabase);

  return NextResponse.json({ ranked_teachers, eval_id });
});
