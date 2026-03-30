// Teacher Availability API Logic with Redis Caching

import { buildCacheKey, redis, CACHE_TTL_SECONDS } from "@/lib/redis/client";
import { createServiceClient } from "@/lib/supabase/service";
import { errors } from "@/lib/errors";
import type { TeachersAvailableQuery } from "@/lib/validations";
import type { TeacherWithAvailability } from "@/types";

// Shape of a row returned by the teachers + profiles + availability join.
// Cast once at the data level instead of field-by-field assertions.
interface TeacherRow {
  id: string;
  user_id: string;
  classroom: string;
  bio: string;
  hourly_rate?: number | null;
  full_name?: string | null;
  position?: string | null;
  created_at: string;
  profiles: { email: string };
  availability: {
    start_date: string;
    end_date: string;
    start_time?: string | null;
    end_time?: string | null;
  }[];
}

export interface TeachersResponse {
  teachers: TeacherWithAvailability[];
}

// Columns introduced in migrations 004 + 005. Selected when available, omitted otherwise.
const SELECT_V2 = `
  id, user_id, classroom, bio, hourly_rate, full_name, position, created_at,
  profiles!inner (email),
  availability!inner (start_date, end_date, start_time, end_time)
`;
const SELECT_V1 = `
  id, user_id, classroom, bio, created_at,
  profiles!inner (email),
  availability!inner (start_date, end_date)
`;

/**
 * Build and run the teachers query with all filters applied.
 * Accepts the select string so we can fall back from v2 to v1 columns.
 */
async function runQuery(
  supabase: ReturnType<typeof import("@/lib/supabase/service").createServiceClient>,
  select: string,
  query: TeachersAvailableQuery
) {
  let q = supabase.from("teachers").select(select).eq("availability.is_booked", false);

  // Overlap condition: teacher.start_date ≤ search.end_date AND teacher.end_date ≥ search.start_date
  if (query.end_date) q = q.lte("availability.start_date", query.end_date);
  if (query.start_date) q = q.gte("availability.end_date", query.start_date);
  if (query.classroom) q = q.ilike("classroom", `%${query.classroom}%`);
  if (query.name) q = q.ilike("profiles.email", `%${query.name}%`);

  return q;
}

/**
 * Get available teachers with Redis caching.
 * Cache-first strategy; fails open if Redis is unavailable.
 * Tries v2 select (migration 004: hourly_rate, start_time, end_time) and falls back
 * to v1 if those columns don't exist yet in the schema cache (PGRST204).
 * name field is sourced from profiles.email; full_name and position from migration 005.
 */
export async function getAvailableTeachers(
  query: TeachersAvailableQuery
): Promise<TeachersResponse> {
  const cacheKey = buildCacheKey(query);

  // 1. Cache-first: try Redis, fail open on error
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as TeachersResponse;
  } catch {
    // Redis unavailable — proceed to DB
  }

  // 2. Supabase query: join teachers → availability (filtered) → profiles (for name).
  // Service role is used here because: auth + role check is already done in the route
  // handler, and the profiles RLS policy only allows users to read their own profile row,
  // which would prevent parents from seeing teacher profile emails via the !inner join.
  const supabase = createServiceClient();

  let { data, error } = await runQuery(supabase, SELECT_V2, query);

  if (error) {
    // v2 select failed — may be a schema cache miss (migration 004 not applied).
    // Retry with v1 columns; if that also fails, propagate.
    ({ data, error } = await runQuery(supabase, SELECT_V1, query));
  }

  if (error) throw errors.internal();

  // 3. Shape response — map profiles.email → name; new fields default to null if absent
  const teachers: TeacherWithAvailability[] = ((data ?? []) as unknown as TeacherRow[]).map(
    (row) => ({
      id: row.id,
      user_id: row.user_id,
      classroom: row.classroom,
      bio: row.bio,
      hourly_rate: row.hourly_rate ?? null,
      full_name: row.full_name ?? null,
      position: row.position ?? null,
      created_at: row.created_at,
      name: row.profiles.email,
      availability: row.availability.map((a) => ({
        start_date: a.start_date,
        end_date: a.end_date,
        start_time: a.start_time ?? null,
        end_time: a.end_time ?? null,
      })),
    })
  );

  const result: TeachersResponse = { teachers };

  // 4. Cache result, fail open on error
  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Redis unavailable — return result anyway
  }

  return result;
}
