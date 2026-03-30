// Gemini 1.5 Pro — teacher ranking and eval judging via Google Generative AI SDK.
// Throws on API error or unparseable response; caller falls through to deterministic fallback.

import { randomInt } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { MatchRequestInput } from "@/lib/validations";
import type { RankedTeacher } from "@/types";

const JUDGE_PROMPT = (input: MatchRequestInput, ranked: RankedTeacher[]) =>
  `
Given this parent's needs and these teachers, is the ranking reasonable? Score 0-10 with reasoning.
Return ONLY valid JSON: {"score": <number>, "reasoning": "..."}

Parent's child classroom: ${input.child_classroom}
Date range: ${input.start_date} to ${input.end_date}

Ranked teachers:
${JSON.stringify(ranked, null, 2)}
`.trim();

const RANKING_PROMPT = (input: MatchRequestInput) =>
  `
You are ranking babysitting teachers for a parent.
Return ONLY valid JSON — an array with no extra text, markdown, or explanation:
[{"id":"...","name":"...","rank":1,"reasoning":"..."},...]

Rank higher if the teacher's classroom matches the child's classroom.
Child's classroom: ${input.child_classroom}

Teachers:
${JSON.stringify(input.teachers, null, 2)}
`.trim();

function pickGeminiKey(): string {
  const raw = process.env.GEMINI_API_KEY;
  if (!raw) throw new Error("GEMINI_API_KEY not set");
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return keys[randomInt(keys.length)];
}

export async function rankTeachers(input: MatchRequestInput): Promise<RankedTeacher[]> {
  const apiKey = pickGeminiKey();

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-1.5-pro",
  });

  const result = await model.generateContent(RANKING_PROMPT(input));
  const text = result.response.text().trim();

  // Strip markdown code fences if the model wraps the JSON
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(json) as RankedTeacher[];
}

export async function judgeRanking(
  input: MatchRequestInput,
  ranked: RankedTeacher[]
): Promise<number> {
  const apiKey = pickGeminiKey();
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-1.5-pro",
  });

  const result = await model.generateContent(JUDGE_PROMPT(input, ranked));
  const text = result.response
    .text()
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const { score } = JSON.parse(text) as { score: number };
  return score;
}
