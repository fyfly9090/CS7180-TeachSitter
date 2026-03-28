// GET /api/teachers/available — Search available teachers by date range and classroom.
// Results are Redis-cached per query key (5 min TTL).

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { teachersAvailableQuerySchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";
import { getAvailableTeachers } from "@/lib/api/teachers-available";

export const GET = withApiHandler(async (req: Request) => {
  // Auth: verify user is authenticated and has parent role
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw errors.unauthorized();
  if (user.user_metadata.role !== "parent") throw errors.forbidden();

  // Parse and validate query params
  const { searchParams } = new URL(req.url);
  const query = teachersAvailableQuerySchema.parse({
    start_date: searchParams.get("start_date") ?? undefined,
    end_date: searchParams.get("end_date") ?? undefined,
    classroom: searchParams.get("classroom") ?? undefined,
    name: searchParams.get("name") ?? undefined,
  });

  const result = await getAvailableTeachers(query);
  return NextResponse.json(result);
});
