// RED: API Error Formatting Test
import { describe, test, expect, vi } from 'vitest';
import { createClient } from '../lib/supabase/server';

describe('API Error Formatting', () => {
  test('should return standardized error object when user is not found', async () => {
    // 模拟数据库查询失败
    const supabase = await createClient();
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not Found' } })
    } as any);

    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'none@ex.com', password: '123' })
    });

    const body = await response.json();

    // 强制 AI 必须按此结构返回，严禁直接返回字符串或堆栈跟踪
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(typeof body.error.message).toBe('string');
  });
});
