// RED: API Error Formatting Test
import { describe, test, expect, vi } from "vitest";
import { POST } from "../app/api/auth/login/route";

// Mock Supabase server client
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      }),
    },
  }),
}));

describe("API Error Formatting", () => {
  test("should return standardized error object when user is not found", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "none@ex.com", password: "123" }),
    });

    const response = await POST(request);
    const body = await response.json();

    // 强制 AI 必须按此结构返回，严禁直接返回字符串或堆栈跟踪
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("code");
    expect(typeof body.error.message).toBe("string");
  });
});
