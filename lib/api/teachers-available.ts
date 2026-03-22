// Teacher Availability API Logic with Redis Caching

import redis, { CACHE_TTL_SECONDS } from '../redis/client';

export interface TeacherAvailabilityQuery {
  start_date: string;
  end_date: string;
  classroom?: string;
  name?: string;
}

export interface Teacher {
  id: string;
  name: string;
  classroom?: string;
  bio?: string;
  availability?: Array<{ start_date: string; end_date: string }>;
}

export interface TeachersResponse {
  teachers: Teacher[];
}

/**
 * Build cache key for teacher availability search.
 * Format: avail:{start_date}:{end_date}
 */
function buildCacheKey(start_date: string, end_date: string): string {
  return `avail:${start_date}:${end_date}`;
}

/**
 * Get available teachers with Redis caching.
 * Returns cached results if available, otherwise queries database.
 */
export async function getAvailableTeachers(
  query: TeacherAvailabilityQuery
): Promise<TeachersResponse> {
  const cacheKey = buildCacheKey(query.start_date, query.end_date);

  // Try to get from cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // If not in cache, query database (mock for now)
  const teachers: Teacher[] = [];

  const response = { teachers };

  // Cache the result
  await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS);

  return response;
}
