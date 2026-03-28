// @vitest-environment node
// TDD RED → GREEN: GET /api/evals
// Tests cover: auth (admin only), pagination, response shape.

import { describe, test, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("../lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createServerClient } from "../lib/supabase/server";
import { GET } from "../app/api/evals/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_USER = { id: "uid-admin", user_metadata: { role: "admin" } };
const PARENT_USER = { id: "uid-parent", user_metadata: { role: "parent" } };
const TEACHER_USER = { id: "uid-teacher", user_metadata: { role: "teacher" } };

const EVAL_ROW = {
  id: "550e8400-e29b-41d4-a716-446655440099",
  parent_id: "550e8400-e29b-41d4-a716-446655440001",
  ranked_teachers: [{ id: "t-1", name: "Tara", rank: 1, reasoning: "Same classroom." }],
  judge_score: 8,
  created_at: "2026-03-26T10:00:00Z",
};

/** Build a Supabase mock that returns evals data + count */
function mockSupabase(user: object | null, evalsData: object[] | null = [EVAL_ROW], total = 1) {
  const evalsChain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: evalsData, error: null, count: total }),
  };
  vi.mocked(createServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue(evalsChain),
  } as never);
  return evalsChain;
}

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/evals");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString());
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe("GET /api/evals — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    mockSupabase(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a parent", async () => {
    mockSupabase(PARENT_USER);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  test("returns 403 when user is a teacher", async () => {
    mockSupabase(TEACHER_USER);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Response shape + pagination
// ---------------------------------------------------------------------------

describe("GET /api/evals — response", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 200 with evals array and total for admin", async () => {
    mockSupabase(ADMIN_USER, [EVAL_ROW], 1);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.evals).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  test("returns empty evals array when no records exist", async () => {
    mockSupabase(ADMIN_USER, [], 0);

    const res = await GET(makeGetRequest());

    const body = await res.json();
    expect(body.evals).toEqual([]);
    expect(body.total).toBe(0);
  });

  test("eval record contains expected fields", async () => {
    mockSupabase(ADMIN_USER, [EVAL_ROW], 1);

    const res = await GET(makeGetRequest());
    const body = await res.json();
    const eval_ = body.evals[0];

    expect(eval_).toMatchObject({
      id: expect.any(String),
      parent_id: expect.any(String),
      ranked_teachers: expect.any(Array),
      created_at: expect.any(String),
    });
  });

  test("applies limit and offset to the query", async () => {
    const chain = mockSupabase(ADMIN_USER, [EVAL_ROW], 10);

    await GET(makeGetRequest({ limit: "5", offset: "10" }));

    expect(chain.range).toHaveBeenCalledWith(10, 14); // offset=10, offset+limit-1=14
  });

  test("uses default limit=20 and offset=0 when not provided", async () => {
    const chain = mockSupabase(ADMIN_USER, [], 0);

    await GET(makeGetRequest());

    expect(chain.range).toHaveBeenCalledWith(0, 19); // offset=0, 0+20-1=19
  });

  test("returns 400 when limit exceeds 100", async () => {
    mockSupabase(ADMIN_USER);

    const res = await GET(makeGetRequest({ limit: "101" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  test("orders results by created_at descending", async () => {
    const chain = mockSupabase(ADMIN_USER, [EVAL_ROW], 1);

    await GET(makeGetRequest());

    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });
});
