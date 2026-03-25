// @vitest-environment node
// RED: Middleware route protection tests
// Tests all three user states: unauthenticated, parent, teacher
import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @supabase/ssr before importing middleware
const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { middleware } from "../middleware";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "http://localhost:3000"));
}

function setUser(role: "parent" | "teacher" | null) {
  const user =
    role === null
      ? null
      : { id: "uuid-123", user_metadata: { role } };
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

describe("middleware route protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unauthenticated user", () => {
    test("redirects to /login when visiting a protected parent route", async () => {
      setUser(null);
      const res = await middleware(makeRequest("/dashboard"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    test("redirects to /login when visiting a protected teacher route", async () => {
      setUser(null);
      const res = await middleware(makeRequest("/teacher/dashboard"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    test("returns 401 for non-auth API routes", async () => {
      setUser(null);
      const res = await middleware(makeRequest("/api/teachers/available"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    test("passes through public routes without redirecting", async () => {
      setUser(null);
      const res = await middleware(makeRequest("/login"));
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });
  });

  describe("authenticated parent", () => {
    test("passes through parent routes", async () => {
      setUser("parent");
      const res = await middleware(makeRequest("/dashboard"));
      expect(res.status).not.toBe(307);
    });

    test("redirects to /dashboard when visiting /teacher/*", async () => {
      setUser("parent");
      const res = await middleware(makeRequest("/teacher/dashboard"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/dashboard");
      expect(res.headers.get("location")).not.toContain("/teacher");
    });
  });

  describe("authenticated teacher", () => {
    test("passes through teacher routes", async () => {
      setUser("teacher");
      const res = await middleware(makeRequest("/teacher/setup"));
      expect(res.status).not.toBe(307);
    });

    test("redirects to /teacher/dashboard when visiting parent routes", async () => {
      setUser("teacher");
      const res = await middleware(makeRequest("/dashboard"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/teacher/dashboard");
    });
  });
});
