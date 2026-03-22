// RED: Teacher Availability Caching Test
import { describe, test, expect, vi, beforeEach } from 'vitest';
import redis from '../lib/redis/client';

describe('Teacher Availability Caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return cached results from Redis if available', async () => {
    const cacheKey = 'avail:2026-06-16:2026-06-20';
    const mockCachedData = { teachers: [{ id: '123', name: 'Cached Teacher' }] };

    // 模拟 Redis get 返回数据
    const redisSpy = vi.spyOn(redis, 'get').mockResolvedValue(JSON.stringify(mockCachedData));

    const response = await fetch(`http://localhost:3000/api/teachers/available?start_date=2026-06-16&end_date=2026-06-20`);
    const data = await response.json();

    expect(redisSpy).toHaveBeenCalledWith(cacheKey);
    expect(data.teachers[0].name).toBe('Cached Teacher');
  });
});
