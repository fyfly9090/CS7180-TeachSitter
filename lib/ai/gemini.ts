// Gemini 1.5 Pro — teacher ranking via Google Generative AI SDK.
// Throws on API error or unparseable response; caller falls through to Claude.

import { GoogleGenerativeAI } from "@google/generative-ai";
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

export async function rankTeachers(input: MatchRequestInput): Promise<RankedTeacher[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-1.5-pro",
  });

  const result = await model.generateContent(RANKING_PROMPT(input));
  const text = result.response.text().trim();

  // Strip markdown code fences if the model wraps the JSON
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(json) as RankedTeacher[];
}
