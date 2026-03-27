// Claude 3.5 Sonnet — teacher ranking via Anthropic SDK.
// Throws on API error or unparseable response; caller falls through to fallback.

import Anthropic from "@anthropic-ai/sdk";
import type { MatchRequestInput } from "@/lib/validations";
import type { RankedTeacher } from "@/types";

const RANKING_PROMPT = (input: MatchRequestInput) => `
You are ranking babysitting teachers for a parent.
Return ONLY valid JSON — an array with no extra text, markdown, or explanation:
[{"id":"...","name":"...","rank":1,"reasoning":"..."},...]

Rank higher if the teacher's classroom matches the child's classroom.
Child's classroom: ${input.child_classroom}

Teachers:
${JSON.stringify(input.teachers, null, 2)}
`.trim();

const JUDGE_PROMPT = (input: MatchRequestInput, ranked: RankedTeacher[]) => `
Given this parent's needs and these teachers, is the ranking reasonable? Score 0-10 with reasoning.
Return ONLY valid JSON: {"score": <number>, "reasoning": "..."}

Parent's child classroom: ${input.child_classroom}
Date range: ${input.start_date} to ${input.end_date}

Ranked teachers:
${JSON.stringify(ranked, null, 2)}
`.trim();

export async function rankTeachers(input: MatchRequestInput): Promise<RankedTeacher[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: RANKING_PROMPT(input) }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");

  const text = block.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(text) as RankedTeacher[];
}

export async function judgeRanking(
  input: MatchRequestInput,
  ranked: RankedTeacher[]
): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 256,
    messages: [{ role: "user", content: JUDGE_PROMPT(input, ranked) }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude judge");

  const text = block.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const { score } = JSON.parse(text) as { score: number };
  return score;
}
