// Redis client — used exclusively for /api/teachers/available caching.
// Singleton pattern: one connection shared across all requests in the process.

import { Redis } from 'ioredis'

let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL
    if (!url) throw new Error('REDIS_URL environment variable is not set')

    redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })
  }
  return redis
}

// Cache key format: teachers:available:{start_date}:{end_date}:{classroom}:{name}
// Empty string used for absent optional params to keep key structure stable.
export function buildCacheKey(params: {
  start_date: string
  end_date: string
  classroom?: string
  name?: string
}): string {
  return [
    'teachers:available',
    params.start_date,
    params.end_date,
    params.classroom ?? '',
    params.name ?? '',
  ].join(':')
}

// Cache TTL for available teachers search results: 5 minutes.
// Short enough to reflect new availability posts promptly.
export const CACHE_TTL_SECONDS = 300
