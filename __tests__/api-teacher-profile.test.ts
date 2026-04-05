// @vitest-environment node
// TDD RED → GREEN: GET /api/teachers/me + PATCH /api/teachers/[id]

import { describe, test, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("../lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("../lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { createServerClient } from "../lib/supabase/server";
import { updateTeacherProfileSchema } from "../lib/validations";
import { GET } from "../app/api/teachers/me/route";
import { PATCH } from "../app/api/teachers/[id]/route";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEACHER_ROW_ID = "550e8400-e29b-41d4-a716-446655440010";
const OTHER_TEACHER_ROW_ID = "550e8400-e29b-41d4-a716-446655440011";
const PARENT_UID = "550e8400-e29b-41d4-a716-446655440001";
const TEACHER_UID = "550e8400-e29b-41d4-a716-446655440002";

const PARENT_USER = { id: PARENT_UID, user_metadata: { role: "parent" } };
const TEACHER_USER = { id: TEACHER_UID, user_metadata: { role: "teacher" } };

const TEACHER_ROW = {
  id: TEACHER_ROW_ID,
  user_id: TEACHER_UID,
  classroom: "Sunflower Room",
  bio: "Experienced teacher.",
  expertise: ["Art & Crafts", "Storytelling"],
  hourly_rate: null,
  full_name: "Ms. Tara Smith",
  position: "Preschool Teacher",
  created_at: "2026-01-01T00:00:00Z",
};

const AVAIL_ROWS = [
  {
    id: "550e8400-e29b-41d4-a716-446655440020",
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
// Mock helpers (same fluent-chain pattern as api-bookings.test.ts)
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

function makePatchRequest(id: string, body: object): Request {
  return new Request(`http://localhost/api/teachers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(): Request {
  return new Request("http://localhost/api/teachers/me", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Phase B: updateTeacherProfileSchema — Zod validation
// ---------------------------------------------------------------------------

describe("updateTeacherProfileSchema — validation", () => {
  test("accepts valid minimal payload with classroom only", () => {
    expect(() => updateTeacherProfileSchema.parse({ classroom: "Sunflower" })).not.toThrow();
  });

  test("rejects empty classroom string", () => {
    expect(() => updateTeacherProfileSchema.parse({ classroom: "" })).toThrow();
  });

  test("rejects classroom longer than 100 chars", () => {
    expect(() => updateTeacherProfileSchema.parse({ classroom: "x".repeat(101) })).toThrow();
  });

  test("rejects bio longer than 2000 chars", () => {
    expect(() =>
      updateTeacherProfileSchema.parse({ classroom: "A", bio: "x".repeat(2001) })
    ).toThrow();
  });

  test("accepts expertise as empty array", () => {
    expect(() => updateTeacherProfileSchema.parse({ classroom: "A", expertise: [] })).not.toThrow();
  });

  test("rejects expertise containing values not in the allowed enum", () => {
    expect(() =>
      updateTeacherProfileSchema.parse({ classroom: "A", expertise: ["Unknown Skill"] })
    ).toThrow();
  });

  test("rejects expertise array with more than 6 items", () => {
    const ALL = [
      "Art & Crafts",
      "Outdoor Play",
      "STEM Activities",
      "Music & Dance",
      "Storytelling",
      "Social Skills",
    ];
    // Duplicate first item to exceed 6
    expect(() =>
      updateTeacherProfileSchema.parse({ classroom: "A", expertise: [...ALL, "Art & Crafts"] })
    ).toThrow();
  });

  test("accepts all 6 expertise values", () => {
    expect(() =>
      updateTeacherProfileSchema.parse({
        classroom: "A",
        expertise: [
          "Art & Crafts",
          "Outdoor Play",
          "STEM Activities",
          "Music & Dance",
          "Storytelling",
          "Social Skills",
        ],
      })
    ).not.toThrow();
  });

  test("accepts valid availability array", () => {
    expect(() =>
      updateTeacherProfileSchema.parse({
        classroom: "A",
        availability: [{ start_date: "2026-06-16", end_date: "2026-06-20" }],
      })
    ).not.toThrow();
  });

  test("rejects availability block with end_date before start_date", () => {
    expect(() =>
      updateTeacherProfileSchema.parse({
        classroom: "A",
        availability: [{ start_date: "2026-06-20", end_date: "2026-06-16" }],
      })
    ).toThrow();
  });

  test("rejects availability block with invalid date format", () => {
    expect(() =>
      updateTeacherProfileSchema.parse({
        classroom: "A",
        availability: [{ start_date: "not-a-date", end_date: "2026-06-20" }],
      })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Phase C: PATCH /api/teachers/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/teachers/[id] — auth & role", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    mockSupabase(null, []);
    const res = await PATCH(makePatchRequest(TEACHER_ROW_ID, { classroom: "Room A" }), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a parent (not teacher)", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await PATCH(makePatchRequest(TEACHER_ROW_ID, { classroom: "Room A" }), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/teachers/[id] — input validation", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 400 when classroom is empty string", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await PATCH(makePatchRequest(TEACHER_ROW_ID, { classroom: "" }), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  test("returns 400 when bio exceeds 2000 chars", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await PATCH(
      makePatchRequest(TEACHER_ROW_ID, { classroom: "A", bio: "x".repeat(2001) }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when expertise contains invalid value", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await PATCH(
      makePatchRequest(TEACHER_ROW_ID, {
        classroom: "A",
        expertise: ["Underwater Basket Weaving"],
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/teachers/[id] — ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 404 when no teacher row found for the authenticated user", async () => {
    mockSupabase(TEACHER_USER, [{ data: null, error: { code: "PGRST116", message: "Not found" } }]);
    const res = await PATCH(makePatchRequest(TEACHER_ROW_ID, { classroom: "Room A" }), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(404);
  });

  test("returns 403 when [id] param refers to a different teacher's row", async () => {
    // Auth user owns OTHER_TEACHER_ROW_ID, but param id is TEACHER_ROW_ID
    mockSupabase(TEACHER_USER, [
      { data: { id: OTHER_TEACHER_ROW_ID }, error: null }, // lookup by user_id
    ]);
    const res = await PATCH(makePatchRequest(TEACHER_ROW_ID, { classroom: "Room A" }), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/teachers/[id] — success & error", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 200 with updated teacher on successful PATCH", async () => {
    const UPDATED = { ...TEACHER_ROW, classroom: "Rainbow Room", expertise: ["STEM Activities"] };
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null }, // ownership lookup
      { data: UPDATED, error: null }, // update + select
    ]);
    const res = await PATCH(
      makePatchRequest(TEACHER_ROW_ID, {
        classroom: "Rainbow Room",
        expertise: ["STEM Activities"],
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { teacher: { classroom: string; expertise: string[] } };
    expect(body.teacher.classroom).toBe("Rainbow Room");
    expect(body.teacher.expertise).toEqual(["STEM Activities"]);
  });

  test("returns 500 on Supabase update error", async () => {
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null },
      { data: null, error: { message: "db error" } },
    ]);
    const res = await PATCH(makePatchRequest(TEACHER_ROW_ID, { classroom: "Room A" }), {
      params: Promise.resolve({ id: TEACHER_ROW_ID }),
    });
    expect(res.status).toBe(500);
  });

  test("returns 200 when availability is provided and replaced", async () => {
    const UPDATED = { ...TEACHER_ROW, classroom: "Rainbow Room" };
    mockSupabase(TEACHER_USER, [
      { data: { id: TEACHER_ROW_ID }, error: null }, // ownership lookup
      { data: UPDATED, error: null }, // update + select
      { data: null, error: null }, // delete availability
      { data: null, error: null }, // insert availability
    ]);
    const res = await PATCH(
      makePatchRequest(TEACHER_ROW_ID, {
        classroom: "Rainbow Room",
        availability: [{ start_date: "2026-06-16", end_date: "2026-06-20" }],
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(200);
  });

  test("returns 400 when availability block has end_date before start_date", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await PATCH(
      makePatchRequest(TEACHER_ROW_ID, {
        classroom: "Room A",
        availability: [{ start_date: "2026-06-20", end_date: "2026-06-16" }],
      }),
      { params: Promise.resolve({ id: TEACHER_ROW_ID }) }
    );
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Phase C: GET /api/teachers/me
// ---------------------------------------------------------------------------

describe("GET /api/teachers/me — auth & role", () => {
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
});

describe("GET /api/teachers/me — data", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 200 with auto-created teacher when profile does not exist", async () => {
    mockSupabase(TEACHER_USER, [
      { data: null, error: { code: "PGRST116", message: "Not found" } },
      {
        data: { id: "new-teacher-id", user_id: "teacher-uuid", classroom: "", bio: "" },
        error: null,
      },
    ]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
  });

  test("returns 200 with teacher and availability on success", async () => {
    mockSupabase(TEACHER_USER, [
      { data: TEACHER_ROW, error: null },
      { data: AVAIL_ROWS, error: null },
    ]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      teacher: { classroom: string; expertise: string[] };
      availability: { start_date: string }[];
    };
    expect(body.teacher.classroom).toBe("Sunflower Room");
    expect(body.teacher.expertise).toEqual(["Art & Crafts", "Storytelling"]);
    expect(body.availability[0].start_date).toBe("2026-06-16");
  });
});
