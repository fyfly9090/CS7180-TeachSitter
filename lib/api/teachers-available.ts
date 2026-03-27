// Teacher Availability API Logic with Redis Caching

import { buildCacheKey, redis, CACHE_TTL_SECONDS } from "@/lib/redis/client";
import { createServerClient } from "@/lib/supabase/server";
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
  created_at: string;
  profiles: { email: string };
  availability: { start_date: string; end_date: string }[];
}

export interface TeachersResponse {
  teachers: TeacherWithAvailability[];
}

/**
 * Get available teachers with Redis caching.
 * Cache-first strategy; fails open if Redis is unavailable.
 * name field is sourced from profiles.email (no full-name column exists in schema).
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

  // 2. Supabase query: join teachers → availability (filtered) → profiles (for name)
  const supabase = await createServerClient();

  let queryBuilder = supabase
    .from("teachers")
    .select(
      `
      id,
      user_id,
      classroom,
      bio,
      created_at,
      profiles!inner (email),
      availability!inner (start_date, end_date)
    `
    )
    .eq("availability.is_booked", false);

  if (query.start_date) {
    queryBuilder = queryBuilder.lte("availability.start_date", query.start_date);
  }
  if (query.end_date) {
    queryBuilder = queryBuilder.gte("availability.end_date", query.end_date);
  }

  if (query.classroom) {
    queryBuilder = queryBuilder.ilike("classroom", `%${query.classroom}%`);
  }
  if (query.name) {
    queryBuilder = queryBuilder.ilike("profiles.email", `%${query.name}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) throw errors.internal();

  // 3. Shape response — map profiles.email → name
  const teachers: TeacherWithAvailability[] = ((data ?? []) as TeacherRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    classroom: row.classroom,
    bio: row.bio,
    created_at: row.created_at,
    name: row.profiles.email,
    availability: row.availability,
  }));

  const result: TeachersResponse = { teachers };

  // 4. Cache result, fail open on error
  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Redis unavailable — return result anyway
  }

  return result;
}
