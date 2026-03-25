// Redis client — used exclusively for /api/teachers/available caching.
// Singleton pattern: one connection shared across all requests in the process.

import { Redis } from "ioredis";

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL environment variable is not set");

    redisInstance = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }
  return redisInstance;
}

// Mockable redis client wrapper for testing
export const redis = {
  get: async (key: string) => {
    return getRedisClient().get(key);
  },
  set: async (key: string, value: string, expiryMode?: "EX" | "PX", time?: number) => {
    const client = getRedisClient();
    if (expiryMode === "EX" && time !== undefined) {
      return client.set(key, value, "EX", time);
    }
    if (expiryMode === "PX" && time !== undefined) {
      return client.set(key, value, "PX", time);
    }
    return client.set(key, value);
  },
};

export default redis;

// Cache key format: teachers:available:{start_date}:{end_date}:{classroom}:{name}
// Empty string used for absent optional params to keep key structure stable.
export function buildCacheKey(params: {
  start_date: string;
  end_date: string;
  classroom?: string;
  name?: string;
}): string {
  return [
    "teachers:available",
    params.start_date,
    params.end_date,
    params.classroom ?? "",
    params.name ?? "",
  ].join(":");
}

// Cache TTL for available teachers search results: 5 minutes.
// Short enough to reflect new availability posts promptly.
export const CACHE_TTL_SECONDS = 300;
