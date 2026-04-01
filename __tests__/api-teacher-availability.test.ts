// @vitest-environment node
// TDD RED → GREEN: GET /api/teachers/[id], POST /api/teachers/[id]/availability,
// DELETE /api/teachers/[id]/availability/[avail_id]

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

// Route handlers are imported lazily inside each describe block to avoid
// issues with the GET export not existing yet during RED phase.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEACHER_ROW_ID = "550e8400-e29b-41d4-a716-446655440010";
const OTHER_TEACHER_ROW_ID = "550e8400-e29b-41d4-a716-446655440011";
const PARENT_UID = "550e8400-e29b-41d4-a716-446655440001";
const TEACHER_UID = "550e8400-e29b-41d4-a716-446655440002";
const AVAIL_ID = "550e8400-e29b-41d4-a716-446655440020";

const PARENT_USER = { id: PARENT_UID, user_metadata: { role: "parent" } };
const TEACHER_USER = { id: TEACHER_UID, user_metadata: { role: "teacher" } };

const TEACHER_ROW = {
  id: TEACHER_ROW_ID,
  user_id: TEACHER_UID,
  classroom: "Sunflower Room",
  bio: "Experienced teacher.",
  expertise: ["Art & Crafts"],
  hourly_rate: null,
  full_name: "Ms. Tara Smith",
  position: "Preschool Teacher",
  created_at: "2026-01-01T00:00:00Z",
};

const AVAIL_ROWS = [
  {
    id: AVAIL_ID,
    teacher_id: TEACHER_ROW_ID,
    start_date: "2026-06-16",
    end_date: "2026-06-20",
    start_time: null,
    end_time: null,
    is_booked: false,
    created_at: "2026-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

function makeChain(finalResult: { data: unknown; error: unknown }): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
    order: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
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

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function makeGetRequest(id: string): Request {
  return new Request(`http://localhost/api/teachers/${id}`, { method: "GET" });
}

function makePostRequest(id: string, body: object): Request {
  return new Request(`http://localhost/api/teachers/${id}/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string, availId: string): Request {
  return new Request(`http://localhost/api/teachers/${id}/availability/${availId}`, {
    method: "DELETE",
  });
}

// ===========================================================================
// GET /api/teachers/[id]
// ===========================================================================

describe("GET /api/teachers/[id] — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    const { GET } = await import("../app/api/teachers/[id]/route");
    mockSupabase(null, []);
    const res = await GET(makeGetRequest(TEACHER_ROW_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(401);
  });

  test("returns 200 for authenticated parent", async () => {
    const { GET } = await import("../app/api/teachers/[id]/route");
    mockSupabase(PARENT_USER, [
      { data: TEACHER_ROW, error: null },
      { data: AVAIL_ROWS, error: null },
    ]);
    const res = await GET(makeGetRequest(TEACHER_ROW_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      teacher: { classroom: string };
      availability: unknown[];
    };
    expect(body.teacher.classroom).toBe("Sunflower Room");
    expect(body.availability).toHaveLength(1);
  });

  test("returns 200 for authenticated teacher", async () => {
    const { GET } = await import("../app/api/teachers/[id]/route");
    mockSupabase(TEACHER_USER, [
      { data: TEACHER_ROW, error: null },
      { data: AVAIL_ROWS, error: null },
    ]);
    const res = await GET(makeGetRequest(TEACHER_ROW_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/teachers/[id] — data", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 404 when teacher does not exist", async () => {
    const { GET } = await import("../app/api/teachers/[id]/route");
    mockSupabase(PARENT_USER, [{ data: null, error: { code: "PGRST116", message: "Not found" } }]);
    const res = await GET(makeGetRequest(TEACHER_ROW_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(404);
  });

  test("returns 400 for malformed UUID", async () => {
    const { GET } = await import("../app/api/teachers/[id]/route");
    mockSupabase(PARENT_USER, []);
    const res = await GET(makeGetRequest("not-a-uuid"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns empty availability array when teacher has none", async () => {
    const { GET } = await import("../app/api/teachers/[id]/route");
    mockSupabase(PARENT_USER, [
      { data: TEACHER_ROW, error: null },
      { data: [], error: null },
    ]);
    const res = await GET(makeGetRequest(TEACHER_ROW_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { availability: unknown[] };
    expect(body.availability).toEqual([]);
  });
});

// ===========================================================================
// POST /api/teachers/[id]/availability
// ===========================================================================

describe("POST /api/teachers/[id]/availability — auth & role", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(null, []);
    const res = await POST(
      makePostRequest(TEACHER_ROW_ID, {
        start_date: "2026-06-16",
        end_date: "2026-06-20",
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a parent", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(PARENT_USER, []);
    const res = await POST(
      makePostRequest(TEACHER_ROW_ID, {
        start_date: "2026-06-16",
        end_date: "2026-06-20",
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(403);
  });

  test("returns 403 when teacher tries to add to another teacher", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(TEACHER_USER, [{ data: { id: OTHER_TEACHER_ROW_ID }, error: null }]);
    const res = await POST(
      makePostRequest(TEACHER_ROW_ID, {
        start_date: "2026-06-16",
        end_date: "2026-06-20",
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(403);
  });

  test("returns 404 when no teacher row found for user", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(TEACHER_USER, [{ data: null, error: { code: "PGRST116", message: "Not found" } }]);
    const res = await POST(
      makePostRequest(TEACHER_ROW_ID, {
        start_date: "2026-06-16",
        end_date: "2026-06-20",
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/teachers/[id]/availability — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 400 for malformed teacher ID", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(TEACHER_USER, []);
    const res = await POST(
      makePostRequest("not-a-uuid", { start_date: "2026-06-16", end_date: "2026-06-20" }),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 for missing start_date", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(TEACHER_USER, []);
    const res = await POST(makePostRequest(TEACHER_ROW_ID, { end_date: "2026-06-20" }), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid date format", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(TEACHER_USER, []);
    const res = await POST(
      makePostRequest(TEACHER_ROW_ID, {
        start_date: "not-a-date",
        end_date: "2026-06-20",
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when end_date before start_date", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(TEACHER_USER, []);
    const res = await POST(
      makePostRequest(TEACHER_ROW_ID, {
        start_date: "2026-06-20",
        end_date: "2026-06-16",
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/teachers/[id]/availability — success & error", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 201 with created availability on success", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    const CREATED = {
      id: "550e8400-e29b-41d4-a716-446655440030",
      teacher_id: TEACHER_ROW_ID,
      start_date: "2026-06-16",
      end_date: "2026-06-20",
      start_time: null,
      end_time: null,
      is_booked: false,
      created_at: "2026-03-31T00:00:00Z",
    };
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null }, // ownership lookup
      { data: CREATED, error: null }, // insert + select
    ]);
    const res = await POST(
      makePostRequest(TEACHER_ROW_ID, {
        start_date: "2026-06-16",
        end_date: "2026-06-20",
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      availability: { start_date: string; is_booked: boolean };
    };
    expect(body.availability.start_date).toBe("2026-06-16");
    expect(body.availability.is_booked).toBe(false);
  });

  test("returns 500 on Supabase insert error", async () => {
    const { POST } = await import("../app/api/teachers/[id]/availability/route");
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      { data: null, error: { message: "db error" } },
    ]);
    const res = await POST(
      makePostRequest(TEACHER_ROW_ID, {
        start_date: "2026-06-16",
        end_date: "2026-06-20",
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(500);
  });
});

// ===========================================================================
// DELETE /api/teachers/[id]/availability/[avail_id]
// ===========================================================================

describe("DELETE /api/teachers/[id]/availability/[avail_id] — auth & role", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(null, []);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a parent", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(PARENT_USER, []);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(403);
  });

  test("returns 403 when teacher tries to delete another teacher's availability", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(TEACHER_USER, [{ data: { id: OTHER_TEACHER_ROW_ID }, error: null }]);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(403);
  });

  test("returns 404 when no teacher row found for user", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(TEACHER_USER, [{ data: null, error: { code: "PGRST116", message: "Not found" } }]);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/teachers/[id]/availability/[avail_id] — validation & data", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 400 for malformed avail_id", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(TEACHER_USER, [{ data: { id: TEACHER_ROW_ID }, error: null }]);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, "not-a-uuid"), {
      params: Promise.resolve({
        id: TEACHER_ROW_ID,
        avail_id: "not-a-uuid",
      }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 404 when availability row does not exist", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      { data: null, error: { code: "PGRST116", message: "Not found" } },
    ]);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(404);
  });

  test("returns 404 when availability belongs to a different teacher", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      {
        data: { id: AVAIL_ID, teacher_id: OTHER_TEACHER_ROW_ID, is_booked: false },
        error: null,
      },
    ]);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(404);
  });

  test("returns 409 when availability is booked", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      {
        data: { id: AVAIL_ID, teacher_id: TEACHER_ROW_ID, is_booked: true },
        error: null,
      },
    ]);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/booked/i);
  });

  test("returns 204 on successful deletion", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null }, // ownership
      {
        data: { id: AVAIL_ID, teacher_id: TEACHER_ROW_ID, is_booked: false },
        error: null,
      }, // fetch avail
      { data: null, error: null }, // delete
    ]);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(204);
  });

  test("returns 500 on Supabase delete error", async () => {
    const { DELETE } = await import("../app/api/teachers/[id]/availability/[avail_id]/route");
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      {
        data: { id: AVAIL_ID, teacher_id: TEACHER_ROW_ID, is_booked: false },
        error: null,
      },
      { data: null, error: { message: "db error" } },
    ]);
    const res = await DELETE(makeDeleteRequest(TEACHER_ROW_ID, AVAIL_ID), {
      params: Promise.resolve({ id: TEACHER_ROW_ID, avail_id: AVAIL_ID }),
    });
    expect(res.status).toBe(500);
  });
});
