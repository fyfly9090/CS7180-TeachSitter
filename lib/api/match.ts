// Match API business logic: parallel AI race + eval logging + async judge.

import { rankTeachers as rankGemini, judgeRanking } from "@/lib/ai/gemini";
import { matchTeachers } from "@/lib/ai/match";
import type { MatchRequestInput } from "@/lib/validations";
import type { RankedTeacher } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MatchResult {
  ranked_teachers: RankedTeacher[];
  eval_id: string;
}

/**
 * Run the AI match pipeline:
 * 1. Race Gemini vs Claude — first successful response wins.
 * 2. Fall back to deterministic matchTeachers() if both AI providers fail.
 * 3. Insert a match_evals row (judge_score starts null).
 * 4. Fire-and-forget async LLM-as-judge to score the result.
 */
export async function runMatch(
  input: MatchRequestInput,
  supabase: SupabaseClient
): Promise<MatchResult> {
  // 1. Try Gemini; fall back to deterministic matching if it fails
  let ranked: RankedTeacher[];
  try {
    ranked = await rankGemini(input);
  } catch {
    ranked = await matchTeachers({ child_classroom: input.child_classroom }, input.teachers);
  }

  // 2. Log to match_evals (judge_score is null until async judge completes)
  const { data: evalRow, error: evalError } = await supabase
    .from("match_evals")
    .insert({ parent_id: input.parent_id, ranked_teachers: ranked })
    .select("id")
    .single();

  if (evalError || !evalRow) {
    // Eval logging failure is non-fatal for the user; re-throw so route returns 500
    throw evalError ?? new Error("Failed to insert match_eval row");
  }

  const evalId = (evalRow as { id: string }).id;

  // 3. Fire-and-forget judge — never blocks the response, never propagates errors
  void runJudge(evalId, input, ranked, supabase);

  return { ranked_teachers: ranked, eval_id: evalId };
}

async function runJudge(
  evalId: string,
  input: MatchRequestInput,
  ranked: RankedTeacher[],
  supabase: SupabaseClient
): Promise<void> {
  try {
    const score = await judgeRanking(input, ranked);
    await supabase.from("match_evals").update({ judge_score: score }).eq("id", evalId);
  } catch {
    // Judge failures are silent — score stays null
  }
}
