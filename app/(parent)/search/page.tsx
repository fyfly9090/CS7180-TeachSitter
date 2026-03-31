import { getAvailableTeachers } from "@/lib/api/teachers-available";
import { createServerClient } from "@/lib/supabase/server";
import SearchClient from "./SearchClient";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const start_date = params.start_date;
  const end_date = params.end_date;
  const classroom = params.classroom;

  let initialTeachers: Awaited<ReturnType<typeof getAvailableTeachers>>["teachers"] = [];
  let initialError = false;
  let parentId = "";

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    parentId = user?.id ?? "";

    const result = await getAvailableTeachers({ start_date, end_date, classroom });
    initialTeachers = result.teachers;
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
      parentId={parentId}
    />
  );
}
