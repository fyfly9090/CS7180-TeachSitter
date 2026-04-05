// @vitest-environment node
// TDD RED → GREEN: GET /api/teachers/me/bookings

import { describe, test, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("../lib/supabase/server", () => ({ createServerClient: vi.fn() }));
vi.mock("../lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { createServerClient } from "../lib/supabase/server";
import { createServiceClient } from "../lib/supabase/service";
import { GET } from "../app/api/teachers/me/bookings/route";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEACHER_ROW_ID = "550e8400-e29b-41d4-a716-446655440010";
const TEACHER_UID = "550e8400-e29b-41d4-a716-446655440002";
const PARENT_UID = "550e8400-e29b-41d4-a716-446655440001";

const PARENT_USER = { id: PARENT_UID, user_metadata: { role: "parent" } };
const TEACHER_USER = { id: TEACHER_UID, user_metadata: { role: "teacher" } };

const CONFIRMED_BOOKING = {
  id: "booking-1",
  parent_id: PARENT_UID,
  teacher_id: TEACHER_ROW_ID,
  start_date: "2026-06-16",
  end_date: "2026-06-20",
  status: "confirmed",
  message: null,
  created_at: "2026-01-01T00:00:00Z",
};

const PENDING_BOOKING = {
  id: "booking-2",
  parent_id: PARENT_UID,
  teacher_id: TEACHER_ROW_ID,
  start_date: "2026-07-01",
  end_date: "2026-07-05",
  status: "pending",
  message: "Hi, can you watch my son?",
  created_at: "2026-01-02T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

function makeChain(finalResult: { data: unknown; error: unknown }): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  };
  (chain as unknown as PromiseLike<unknown>).then = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

function mockSupabase(user: object | null, fromResults: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0;
  vi.mocked(createServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation(() => {
      const result = fromResults[callIndex] ?? { data: null, error: null };
      callIndex++;
      return makeChain(result);
    }),
  } as never);
}

function mockServiceClient(profiles: Array<{ id: string; email: string }>) {
  const chain = makeChain({ data: profiles, error: null });
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn().mockReturnValue(chain),
  } as never);
}

function makeGetRequest(): Request {
  return new Request("http://localhost/api/teachers/me/bookings", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/teachers/me/bookings — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    mockSupabase(null, []);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a parent", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  test("returns 404 when teacher profile does not exist", async () => {
    mockSupabase(TEACHER_USER, [{ data: null, error: { code: "PGRST116", message: "Not found" } }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(404);
  });
});

describe("GET /api/teachers/me/bookings — data", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 200 with empty arrays when teacher has no bookings", async () => {
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      { data: [], error: null },
    ]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { confirmed: unknown[]; pending: unknown[] };
    expect(body.confirmed).toEqual([]);
    expect(body.pending).toEqual([]);
  });

  test("returns confirmed bookings enriched with parent display name", async () => {
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      { data: [CONFIRMED_BOOKING], error: null },
    ]);
    mockServiceClient([{ id: PARENT_UID, email: "patricia.johnson@example.com" }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      confirmed: { id: string; parent_display_name: string }[];
      pending: unknown[];
    };
    expect(body.confirmed).toHaveLength(1);
    expect(body.confirmed[0].id).toBe("booking-1");
    expect(body.confirmed[0].parent_display_name).toBe("Patricia Johnson");
    expect(body.pending).toEqual([]);
  });

  test("returns pending bookings enriched with parent display name", async () => {
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      { data: [PENDING_BOOKING], error: null },
    ]);
    mockServiceClient([{ id: PARENT_UID, email: "patricia.johnson@example.com" }]);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      pending: { parent_display_name: string; parent_email: string }[];
    };
    expect(body.pending).toHaveLength(1);
    expect(body.pending[0].parent_email).toBe("patricia.johnson@example.com");
    expect(body.pending[0].parent_display_name).toBe("Patricia Johnson");
  });

  test("returns 500 when bookings query fails", async () => {
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      { data: null, error: { message: "db error" } },
    ]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});
