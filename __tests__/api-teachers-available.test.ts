// @vitest-environment node
// TDD RED → GREEN: GET /api/teachers/available
// Tests cover: cache hit/miss, filters, Redis fail-open, input validation, role check.

import { describe, test, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must come before any imports that transitively pull these modules
// ---------------------------------------------------------------------------

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// Mock redis client
vi.mock("../lib/redis/client", () => {
  const redisMock = {
    get: vi.fn(),
    set: vi.fn(),
  };
  return {
    default: redisMock,
    redis: redisMock,
    buildCacheKey: vi.fn(
      (params: { start_date: string; end_date: string; classroom?: string; name?: string }) =>
        ["avail", params.start_date, params.end_date, params.classroom ?? "", params.name ?? ""].join(
          ":"
        )
    ),
    CACHE_TTL_SECONDS: 300,
  };
});

// Mock Supabase server client
vi.mock("../lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import redis, { buildCacheKey, CACHE_TTL_SECONDS } from "../lib/redis/client";
import { createServerClient } from "../lib/supabase/server";
import { getAvailableTeachers } from "../lib/api/teachers-available";
import { GET } from "../app/api/teachers/available/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PARENT_USER = { id: "uid-parent", user_metadata: { role: "parent" } };
const TEACHER_USER = { id: "uid-teacher", user_metadata: { role: "teacher" } };

const TEACHER_ROW = {
  id: "t-uuid-1",
  user_id: "u-uuid-1",
  classroom: "Sunflower",
  bio: "Loves art and outdoor play.",
  created_at: "2026-01-01T00:00:00Z",
  profiles: { email: "tara@test.com" },
  availability: [{ start_date: "2026-06-16", end_date: "2026-06-20" }],
};

const SHAPED_TEACHER = {
  id: "t-uuid-1",
  user_id: "u-uuid-1",
  classroom: "Sunflower",
  bio: "Loves art and outdoor play.",
  created_at: "2026-01-01T00:00:00Z",
  name: "tara@test.com",
  availability: [{ start_date: "2026-06-16", end_date: "2026-06-20" }],
};

/** Build a chainable Supabase query mock that resolves to { data, error } */
function makeQueryChain(rows: object[] | null, error: object | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: object[] | null; error: object | null }) => void) =>
      resolve({ data: rows, error }),
  };
  return chain;
}

/** Mock createServerClient for Supabase queries (no auth) */
function mockSupabaseQuery(chain: ReturnType<typeof makeQueryChain>) {
  vi.mocked(createServerClient).mockResolvedValue({
    from: vi.fn().mockReturnValue(chain),
  } as never);
  return chain;
}

/** Mock createServerClient for route auth + optional query chain */
function mockSupabaseWithAuth(
  user: object | null,
  queryChain?: ReturnType<typeof makeQueryChain>
) {
  vi.mocked(createServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: queryChain ? vi.fn().mockReturnValue(queryChain) : vi.fn(),
  } as never);
}

/** Build a GET Request with given query params */
function makeGetRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/teachers/available");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString());
}

// ---------------------------------------------------------------------------
// getAvailableTeachers — cache layer
// ---------------------------------------------------------------------------

describe("getAvailableTeachers — cache", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns cached data and skips Supabase when Redis cache hit", async () => {
    const cached = { teachers: [SHAPED_TEACHER] };
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(cached));

    const result = await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    expect(redis.get).toHaveBeenCalledWith("avail:2026-06-16:2026-06-20::");
    expect(createServerClient).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  test("cache key includes classroom and name when provided", async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify({ teachers: [] }));

    await getAvailableTeachers({
      start_date: "2026-06-16",
      end_date: "2026-06-20",
      classroom: "Sunflower",
      name: "tara",
    });

    expect(redis.get).toHaveBeenCalledWith("avail:2026-06-16:2026-06-20:Sunflower:tara");
  });

  test("queries Supabase and caches result on cache miss", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue("OK");
    const chain = mockSupabaseQuery(makeQueryChain([TEACHER_ROW]));

    const result = await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    expect(redis.get).toHaveBeenCalledOnce();
    expect(chain.select).toHaveBeenCalledOnce();
    expect(redis.set).toHaveBeenCalledWith(
      "avail:2026-06-16:2026-06-20::",
      expect.any(String),
      "EX",
      CACHE_TTL_SECONDS
    );
    expect(result.teachers[0]).toMatchObject({ id: "t-uuid-1", name: "tara@test.com" });
  });

  test("stores shaped result in Redis (profiles.email mapped to name)", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue("OK");
    mockSupabaseQuery(makeQueryChain([TEACHER_ROW]));

    await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    const stored = JSON.parse(vi.mocked(redis.set).mock.calls[0][1] as string);
    expect(stored.teachers[0].name).toBe("tara@test.com");
    expect(stored.teachers[0].availability).toEqual([
      { start_date: "2026-06-16", end_date: "2026-06-20" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// getAvailableTeachers — Redis fail-open
// ---------------------------------------------------------------------------

describe("getAvailableTeachers — Redis fail-open", () => {
  beforeEach(() => vi.clearAllMocks());

  test("proceeds to Supabase if Redis.get throws (Redis down)", async () => {
    vi.mocked(redis.get).mockRejectedValue(new Error("Redis connection refused"));
    vi.mocked(redis.set).mockResolvedValue("OK");
    mockSupabaseQuery(makeQueryChain([TEACHER_ROW]));

    const result = await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    expect(result.teachers).toHaveLength(1);
    expect(createServerClient).toHaveBeenCalled();
  });

  test("returns teachers even if Redis.set throws after DB query", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockRejectedValue(new Error("Redis write failed"));
    mockSupabaseQuery(makeQueryChain([TEACHER_ROW]));

    const result = await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    expect(result.teachers).toHaveLength(1);
    expect(result.teachers[0].name).toBe("tara@test.com");
  });
});

// ---------------------------------------------------------------------------
// getAvailableTeachers — Supabase query shape
// ---------------------------------------------------------------------------

describe("getAvailableTeachers — Supabase query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue("OK");
  });

  test("applies lte(availability.start_date) and gte(availability.end_date)", async () => {
    const chain = mockSupabaseQuery(makeQueryChain([]));

    await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    expect(chain.lte).toHaveBeenCalledWith("availability.start_date", "2026-06-16");
    expect(chain.gte).toHaveBeenCalledWith("availability.end_date", "2026-06-20");
  });

  test("filters booked slots with eq(availability.is_booked, false)", async () => {
    const chain = mockSupabaseQuery(makeQueryChain([]));

    await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    expect(chain.eq).toHaveBeenCalledWith("availability.is_booked", false);
  });

  test("applies classroom ilike filter when classroom provided", async () => {
    const chain = mockSupabaseQuery(makeQueryChain([]));

    await getAvailableTeachers({
      start_date: "2026-06-16",
      end_date: "2026-06-20",
      classroom: "Sunflower",
    });

    expect(chain.ilike).toHaveBeenCalledWith("classroom", "%Sunflower%");
  });

  test("does not call ilike for classroom when not provided", async () => {
    const chain = mockSupabaseQuery(makeQueryChain([]));

    await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    const classroomCalls = vi.mocked(chain.ilike).mock.calls.filter(([col]) => col === "classroom");
    expect(classroomCalls).toHaveLength(0);
  });

  test("applies name ilike filter on profiles.email when name provided", async () => {
    const chain = mockSupabaseQuery(makeQueryChain([]));

    await getAvailableTeachers({
      start_date: "2026-06-16",
      end_date: "2026-06-20",
      name: "tara",
    });

    expect(chain.ilike).toHaveBeenCalledWith("profiles.email", "%tara%");
  });

  test("returns empty teachers array when no results", async () => {
    mockSupabaseQuery(makeQueryChain([]));

    const result = await getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" });

    expect(result.teachers).toEqual([]);
  });

  test("throws INTERNAL_ERROR on Supabase error (does not leak DB details)", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(createServerClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(
        makeQueryChain(null, { code: "PGRST116", message: "Not found" })
      ),
    } as never);

    await expect(
      getAvailableTeachers({ start_date: "2026-06-16", end_date: "2026-06-20" })
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// GET /api/teachers/available — route handler
// Route tests use cache hit to avoid needing a second Supabase query mock.
// Auth mock handles the route-level getUser(); Redis cache hit bypasses the DB query.
// ---------------------------------------------------------------------------

describe("GET /api/teachers/available — route handler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 400 when start_date is missing", async () => {
    mockSupabaseWithAuth(PARENT_USER);
    const res = await GET(makeGetRequest({ end_date: "2026-06-20" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  test("returns 400 when end_date is missing", async () => {
    mockSupabaseWithAuth(PARENT_USER);
    const res = await GET(makeGetRequest({ start_date: "2026-06-16" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  test("returns 400 when end_date is before start_date", async () => {
    mockSupabaseWithAuth(PARENT_USER);
    const res = await GET(makeGetRequest({ start_date: "2026-06-20", end_date: "2026-06-16" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  test("returns 400 when date format is invalid (not YYYY-MM-DD)", async () => {
    mockSupabaseWithAuth(PARENT_USER);
    const res = await GET(makeGetRequest({ start_date: "16-06-2026", end_date: "20-06-2026" }));
    expect(res.status).toBe(400);
  });

  test("returns 401 when user is unauthenticated", async () => {
    mockSupabaseWithAuth(null);
    const res = await GET(
      makeGetRequest({ start_date: "2026-06-16", end_date: "2026-06-20" })
    );
    expect(res.status).toBe(401);
  });

  test("returns 403 when authenticated user is a teacher (not parent)", async () => {
    mockSupabaseWithAuth(TEACHER_USER);
    const res = await GET(
      makeGetRequest({ start_date: "2026-06-16", end_date: "2026-06-20" })
    );
    expect(res.status).toBe(403);
  });

  test("returns 200 with teachers array on valid parent request (cache hit)", async () => {
    // Route calls createServerClient for auth; getAvailableTeachers calls it for query.
    // We use a cache hit so the second createServerClient call is never reached.
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify({ teachers: [SHAPED_TEACHER] }));
    mockSupabaseWithAuth(PARENT_USER);

    const res = await GET(
      makeGetRequest({ start_date: "2026-06-16", end_date: "2026-06-20" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.teachers).toHaveLength(1);
    expect(body.teachers[0].name).toBe("tara@test.com");
  });

  test("passes classroom and name query params through to cache key lookup", async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify({ teachers: [] }));
    mockSupabaseWithAuth(PARENT_USER);

    await GET(
      makeGetRequest({
        start_date: "2026-06-16",
        end_date: "2026-06-20",
        classroom: "Sunflower",
        name: "tara",
      })
    );

    expect(redis.get).toHaveBeenCalledWith("avail:2026-06-16:2026-06-20:Sunflower:tara");
  });
});
