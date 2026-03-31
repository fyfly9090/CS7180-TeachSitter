// Match API business logic: parallel AI race + eval logging + async judge.

import { rankTeachers as rankGemini, judgeRanking } from "@/lib/ai/gemini";
import { matchTeachers } from "@/lib/ai/match";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchRequestInput } from "@/lib/validations";
import type { RankedTeacher } from "@/types";

export interface MatchResult {
  ranked_teachers: RankedTeacher[];
  eval_id: string;
}

/**
 * Run the AI match pipeline:
 * 1. Race Gemini vs Claude — first successful response wins.
 * 2. Fall back to deterministic matchTeachers() if both AI providers fail.
 * 3. Insert a match_evals row via admin client (bypasses RLS — service role).
 * 4. Fire-and-forget async LLM-as-judge to score the result.
 */
export async function runMatch(input: MatchRequestInput): Promise<MatchResult> {
  // 1. Try Gemini; fall back to deterministic matching if it fails
  let ranked: RankedTeacher[];
  try {
    ranked = await rankGemini(input);
  } catch {
    ranked = await matchTeachers({ child_classroom: input.child_classroom }, input.teachers);
  }

  // 2. Log to match_evals using admin client — bypasses "deny authenticated" RLS policy.
  const admin = createAdminClient();
  const { data: evalRow, error: evalError } = await admin
    .from("match_evals")
    .insert({ parent_id: input.parent_id, ranked_teachers: ranked, judge_score: null })
    .select("id")
    .single();

  if (evalError || !evalRow) {
    throw evalError ?? new Error("Failed to insert match_eval row");
  }

  const evalId = (evalRow as { id: string }).id;

  // 3. Fire-and-forget judge — never blocks the response, never propagates errors
  void runJudge(evalId, input, ranked, admin);

  return { ranked_teachers: ranked, eval_id: evalId };
}

async function runJudge(
  evalId: string,
  input: MatchRequestInput,
  ranked: RankedTeacher[],
  admin: ReturnType<typeof createAdminClient>
): Promise<void> {
  try {
    const score = await judgeRanking(input, ranked);
    await admin.from("match_evals").update({ judge_score: score }).eq("id", evalId);
  } catch {
    // Judge failures are silent — score stays null
  }
}
