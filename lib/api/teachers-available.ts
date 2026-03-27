// Teacher Availability API Logic with Redis Caching

import { buildCacheKey, redis, CACHE_TTL_SECONDS } from "@/lib/redis/client";
import { createServerClient } from "@/lib/supabase/server";
import { errors } from "@/lib/errors";
import type { TeachersAvailableQuery } from "@/lib/validations";
import type { TeacherWithAvailability, Availability } from "@/types";

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
    .lte("availability.start_date", query.start_date)
    .gte("availability.end_date", query.end_date)
    .eq("availability.is_booked", false);

  if (query.classroom) {
    queryBuilder = queryBuilder.ilike("classroom", `%${query.classroom}%`);
  }
  if (query.name) {
    queryBuilder = queryBuilder.ilike("profiles.email", `%${query.name}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) throw errors.internal();

  // 3. Shape response — map profiles.email → name
  const teachers: TeacherWithAvailability[] = (data ?? []).map((row) => {
    const profile = row.profiles as { email: string };
    const availability = row.availability as Pick<Availability, "start_date" | "end_date">[];
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      classroom: row.classroom as string,
      bio: row.bio as string,
      created_at: row.created_at as string,
      name: profile.email,
      availability,
    };
  });

  const result: TeachersResponse = { teachers };

  // 4. Cache result, fail open on error
  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Redis unavailable — return result anyway
  }

  return result;
}
