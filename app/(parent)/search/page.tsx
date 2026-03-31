import { getAvailableTeachers } from "@/lib/api/teachers-available";
import { rankTeachers as rankGemini } from "@/lib/ai/gemini";
import { matchTeachers } from "@/lib/ai/match";
import { createServerClient } from "@/lib/supabase/server";
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
  const child_classroom = classroom ?? "";

  let initialTeachers: TeacherResult[] = [];
  let initialError = false;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await getAvailableTeachers({ start_date, end_date, classroom });
    const teachers = result.teachers;

    if (teachers.length > 0) {
      const ranked = await rankTeachers(teachers, {
        user,
        child_classroom,
        start_date,
        end_date,
      });
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

/**
 * Rank teachers using Gemini when the user is logged in and dates are provided.
 * Falls back to deterministic matching if Gemini fails or dates are absent.
 */
async function rankTeachers(
  teachers: TeacherWithAvailability[],
  opts: {
    user: { id: string } | null;
    child_classroom: string;
    start_date: string | undefined;
    end_date: string | undefined;
  }
): Promise<{ id: string; reasoning: string }[]> {
  const { user, child_classroom, start_date, end_date } = opts;

  if (user && start_date && end_date) {
    try {
      return await rankGemini({
        parent_id: user.id,
        child_classroom,
        start_date,
        end_date,
        teachers: teachers.map((t) => ({
          id: t.id,
          name: t.full_name ?? t.name,
          classroom: t.classroom,
          bio: (t.bio ?? "").slice(0, 2000),
        })),
      });
    } catch (err) {
      console.error("[SearchPage] Gemini ranking failed, using deterministic fallback:", err);
    }
  }

  return matchTeachers({ child_classroom }, teachers);
}
