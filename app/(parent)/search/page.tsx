import { getAvailableTeachers } from "@/lib/api/teachers-available";
import { matchTeachers } from "@/lib/ai/match";
import SearchClient from "./SearchClient";
import type { TeacherWithAvailability } from "@/types";

type TeacherResult = TeacherWithAvailability & { reasoning?: string };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const start_date = params.start_date;
  const end_date = params.end_date;
  const classroom = params.classroom;

  let initialTeachers: TeacherResult[] = [];
  let initialError = false;

  try {
    const result = await getAvailableTeachers({ start_date, end_date, classroom });
    const teachers = result.teachers;

    if (teachers.length > 0) {
      // Rank teachers deterministically and attach per-teacher reasoning.
      // Uses the same fallback logic as /api/match (no AI latency, no eval logging).
      const child_classroom = classroom ?? "";
      const ranked = await matchTeachers({ child_classroom }, teachers);
      const reasoningMap = new Map(ranked.map((r) => [r.id, r.reasoning]));
      initialTeachers = ranked.map((r) => ({
        ...teachers.find((t) => t.id === r.id)!,
        reasoning: reasoningMap.get(r.id),
      }));
    }
  } catch (err) {
    console.error("[SearchPage] Error:", err);
    initialError = true;
  }

  return (
    <SearchClient
      initialTeachers={initialTeachers}
      initialError={initialError}
      initialDateFrom={start_date ?? ""}
      initialDateTo={end_date ?? ""}
      initialClassroom={classroom ?? ""}
    />
  );
}
