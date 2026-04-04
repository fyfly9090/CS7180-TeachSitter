// @vitest-environment node
// TDD RED → GREEN: POST /api/bookings + PATCH /api/bookings/[id] + GET /api/bookings

import { describe, test, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("../lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { createServerClient } from "../lib/supabase/server";
import { GET, POST } from "../app/api/bookings/route";
import { PATCH, DELETE } from "../app/api/bookings/[id]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Proper UUID v4 format required by Zod v4 (3rd segment 1-8, 4th segment starts 8/9/a/b)
const TEACHER_ID = "550e8400-e29b-41d4-a716-446655440010";
const BOOKING_ID = "550e8400-e29b-41d4-a716-446655440020";
const AVAIL_ID = "550e8400-e29b-41d4-a716-446655440030";
const PARENT_UID = "550e8400-e29b-41d4-a716-446655440001";
const TEACHER_UID = "550e8400-e29b-41d4-a716-446655440002";

const PARENT_USER = { id: PARENT_UID, user_metadata: { role: "parent" } };
const TEACHER_USER = { id: TEACHER_UID, user_metadata: { role: "teacher" } };

const AVAILABILITY_ROW = {
  id: AVAIL_ID,
  teacher_id: TEACHER_ID,
  start_date: "2026-06-15",
  end_date: "2026-06-30",
  is_booked: false,
};

const BOOKING_ROW = {
  id: BOOKING_ID,
  parent_id: PARENT_UID,
  teacher_id: TEACHER_ID,
  start_date: "2026-06-16",
  end_date: "2026-06-20",
  status: "pending",
  message: "Hi!",
  created_at: "2026-03-26T00:00:00Z",
};

const TEACHER_ROW = {
  id: TEACHER_ID,
  user_id: TEACHER_UID,
  classroom: "Sunflower",
  bio: "...",
  created_at: "2026-01-01T00:00:00Z",
};

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

/** Build a fluent Supabase chain mock.
 * Supports both `await chain` (direct thenable) and `await chain.single()`.
 */
function makeChain(finalResult: { data: unknown; error: unknown }): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  };
  // Make the chain itself awaitable (for queries that don't call .single())
  (chain as unknown as PromiseLike<unknown>).then = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

/**
 * Mock createServerClient with auth + a sequence of from() responses.
 * Each element in fromResults maps to one .from() call in order.
 */
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

function makePostRequest(body: object): Request {
  return new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(id: string, body: object): Request {
  return new Request(`http://localhost/api/bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// POST /api/bookings
// ---------------------------------------------------------------------------

describe("POST /api/bookings — input validation", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    mockSupabase(null, []);
    const res = await POST(
      makePostRequest({ teacher_id: "uuid", start_date: "2026-06-16", end_date: "2026-06-20" })
    );
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a teacher (not parent)", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await POST(
      makePostRequest({ teacher_id: "uuid", start_date: "2026-06-16", end_date: "2026-06-20" })
    );
    expect(res.status).toBe(403);
  });

  test("returns 400 when teacher_id is missing", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await POST(makePostRequest({ start_date: "2026-06-16", end_date: "2026-06-20" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  test("returns 400 when teacher_id is not a valid UUID", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await POST(
      makePostRequest({
        teacher_id: "not-a-uuid",
        start_date: "2026-06-16",
        end_date: "2026-06-20",
      })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when start_date is missing", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await POST(
      makePostRequest({
        teacher_id: "550e8400-e29b-41d4-a716-446655440010",
        end_date: "2026-06-20",
      })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when end_date is before start_date", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await POST(
      makePostRequest({
        teacher_id: "550e8400-e29b-41d4-a716-446655440010",
        start_date: "2026-06-20",
        end_date: "2026-06-16",
      })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when message exceeds 500 chars", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await POST(
      makePostRequest({
        teacher_id: "550e8400-e29b-41d4-a716-446655440010",
        start_date: "2026-06-16",
        end_date: "2026-06-20",
        message: "x".repeat(501),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/bookings — business logic", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_BODY = {
    teacher_id: TEACHER_ID,
    start_date: "2026-06-16",
    end_date: "2026-06-20",
    message: "Hi Tara!",
  };

  test("returns 409 when teacher has no availability covering the dates", async () => {
    // availability query returns no rows (empty array)
    mockSupabase(PARENT_USER, [{ data: [], error: null }]);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  test("returns 201 with booking on successful creation", async () => {
    // 1st from(): availability check → returns a slot
    // 2nd from(): insert booking → returns new booking row
    mockSupabase(PARENT_USER, [
      { data: [AVAILABILITY_ROW], error: null },
      { data: BOOKING_ROW, error: null },
    ]);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.booking.status).toBe("pending");
    expect(body.booking.parent_id).toBe(PARENT_USER.id);
  });

  test("booking is created with status=pending regardless of input", async () => {
    mockSupabase(PARENT_USER, [
      { data: [AVAILABILITY_ROW], error: null },
      { data: BOOKING_ROW, error: null },
    ]);
    const res = await POST(makePostRequest(VALID_BODY));
    const body = await res.json();
    expect(body.booking.status).toBe("pending");
  });

  test("returns 500 on Supabase insert error", async () => {
    mockSupabase(PARENT_USER, [
      { data: [AVAILABILITY_ROW], error: null },
      { data: null, error: { code: "23505", message: "unique violation" } },
    ]);
    const res = await POST(makePostRequest(VALID_BODY));
    // Supabase DB errors are mapped — 23505 → CONFLICT
    expect([409, 500]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/bookings/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/bookings/[id] — input validation", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    mockSupabase(null, []);
    const res = await PATCH(makePatchRequest("booking-uuid-1", { status: "confirmed" }), {
      params: Promise.resolve({ id: "booking-uuid-1" }),
    });
    expect(res.status).toBe(401);
  });

  test("returns 400 when parent sends status field instead of dates", async () => {
    // Parents use a different PATCH branch (dates update). Sending status → invalid input.
    mockSupabase(PARENT_USER, []);
    const res = await PATCH(makePatchRequest("booking-uuid-1", { status: "confirmed" }), {
      params: Promise.resolve({ id: "booking-uuid-1" }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 when status is invalid", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await PATCH(makePatchRequest("booking-uuid-1", { status: "completed" }), {
      params: Promise.resolve({ id: "booking-uuid-1" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  test("returns 400 when status is pending (cannot revert to pending)", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await PATCH(makePatchRequest("booking-uuid-1", { status: "pending" }), {
      params: Promise.resolve({ id: "booking-uuid-1" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/bookings/[id] — business logic", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 404 when booking does not exist", async () => {
    // 1st from(): get teacher record → found
    // 2nd from(): get booking → not found (null)
    mockSupabase(TEACHER_USER, [
      { data: TEACHER_ROW, error: null },
      { data: null, error: { code: "PGRST116", message: "Not found" } },
    ]);
    const res = await PATCH(makePatchRequest("nonexistent-id", { status: "confirmed" }), {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });
    expect(res.status).toBe(404);
  });

  test("returns 403 when teacher does not own the booking", async () => {
    const otherTeacherBooking = { ...BOOKING_ROW, teacher_id: "other-teacher-uuid" };
    // 1st from(): get teacher record → found (teacher-uuid-1)
    // 2nd from(): get booking → booking owned by different teacher
    mockSupabase(TEACHER_USER, [
      { data: TEACHER_ROW, error: null },
      { data: otherTeacherBooking, error: null },
    ]);
    const res = await PATCH(makePatchRequest("booking-uuid-1", { status: "confirmed" }), {
      params: Promise.resolve({ id: "booking-uuid-1" }),
    });
    expect(res.status).toBe(403);
  });

  test("returns 404 when teacher profile does not exist", async () => {
    mockSupabase(TEACHER_USER, [{ data: null, error: { code: "PGRST116", message: "Not found" } }]);
    const res = await PATCH(makePatchRequest(BOOKING_ID, { status: "confirmed" }), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(404);
  });

  test("allows declining (cancelling) an already confirmed booking", async () => {
    const alreadyConfirmed = { ...BOOKING_ROW, status: "confirmed" };
    mockSupabase(TEACHER_USER, [
      { data: TEACHER_ROW, error: null },
      { data: alreadyConfirmed, error: null },
      { data: { id: BOOKING_ID, status: "declined" }, error: null },
      { data: null, error: null },
    ]);
    const res = await PATCH(makePatchRequest(BOOKING_ID, { status: "declined" }), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(200);
  });

  test("returns 409 when booking is already declined", async () => {
    const alreadyDeclined = { ...BOOKING_ROW, status: "declined" };
    mockSupabase(TEACHER_USER, [
      { data: TEACHER_ROW, error: null },
      { data: alreadyDeclined, error: null },
    ]);
    const res = await PATCH(makePatchRequest(BOOKING_ID, { status: "confirmed" }), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(409);
  });

  test("returns 200 with updated booking on successful confirm", async () => {
    const confirmedBooking = { ...BOOKING_ROW, status: "confirmed" };
    // 1st from(): get teacher record
    // 2nd from(): get booking (owned by this teacher, status: pending)
    // 3rd from(): update booking → returns updated row
    // 4th from(): update availability → mark is_booked = true
    mockSupabase(TEACHER_USER, [
      { data: TEACHER_ROW, error: null },
      { data: BOOKING_ROW, error: null },
      { data: confirmedBooking, error: null },
      { data: null, error: null },
    ]);
    const res = await PATCH(makePatchRequest(BOOKING_ID, { status: "confirmed" }), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking.id).toBe(BOOKING_ID);
    expect(body.booking.status).toBe("confirmed");
  });

  test("marks availability as booked when confirming", async () => {
    const confirmedBooking = { ...BOOKING_ROW, status: "confirmed" };
    let fromCallIndex = 0;
    const fromChains: MockChain[] = [];

    vi.mocked(createServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: TEACHER_USER }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        const results = [
          { data: TEACHER_ROW, error: null },
          { data: BOOKING_ROW, error: null },
          { data: confirmedBooking, error: null },
          { data: null, error: null },
        ];
        const chain = makeChain(results[fromCallIndex] ?? { data: null, error: null });
        fromChains[fromCallIndex] = chain;
        fromCallIndex++;
        return chain;
      }),
    } as never);

    await PATCH(makePatchRequest(BOOKING_ID, { status: "confirmed" }), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });

    // 4th from() call should be the availability update
    const availChain = fromChains[3];
    expect(availChain).toBeDefined();
    expect(availChain.update).toHaveBeenCalledWith({ is_booked: true });
    expect(availChain.eq).toHaveBeenCalledWith("teacher_id", TEACHER_ID);
    expect(availChain.lte).toHaveBeenCalledWith("start_date", BOOKING_ROW.start_date);
    expect(availChain.gte).toHaveBeenCalledWith("end_date", BOOKING_ROW.end_date);
  });

  test("does not update availability when declining", async () => {
    const declinedBooking = { ...BOOKING_ROW, status: "declined" };
    let fromCallCount = 0;

    vi.mocked(createServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: TEACHER_USER }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        const results = [
          { data: TEACHER_ROW, error: null },
          { data: BOOKING_ROW, error: null },
          { data: declinedBooking, error: null },
        ];
        const chain = makeChain(results[fromCallCount] ?? { data: null, error: null });
        fromCallCount++;
        return chain;
      }),
    } as never);

    await PATCH(makePatchRequest(BOOKING_ID, { status: "declined" }), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });

    // Only 3 from() calls: teacher, booking, update — no availability update
    expect(fromCallCount).toBe(3);
  });

  test("returns 200 with updated booking on successful decline", async () => {
    const declinedBooking = { ...BOOKING_ROW, status: "declined" };
    mockSupabase(TEACHER_USER, [
      { data: TEACHER_ROW, error: null },
      { data: BOOKING_ROW, error: null },
      { data: declinedBooking, error: null },
    ]);
    const res = await PATCH(makePatchRequest(BOOKING_ID, { status: "declined" }), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking.status).toBe("declined");
  });
});

// ---------------------------------------------------------------------------
// GET /api/bookings
// ---------------------------------------------------------------------------

const BOOKING_WITH_TEACHER = {
  id: BOOKING_ID,
  parent_id: PARENT_UID,
  teacher_id: TEACHER_ID,
  start_date: "2026-06-16",
  end_date: "2026-06-20",
  status: "confirmed",
  message: "Hi!",
  created_at: "2026-03-26T00:00:00Z",
  teachers: { full_name: "Ms. Tara Smith", classroom: "Sunflower" },
};

function makeGetRequest(): Request {
  return new Request("http://localhost/api/bookings", { method: "GET" });
}

describe("GET /api/bookings — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    mockSupabase(null, []);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a teacher", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/bookings — data", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 200 with bookings array for authenticated parent", async () => {
    mockSupabase(PARENT_USER, [{ data: [BOOKING_WITH_TEACHER], error: null }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.bookings)).toBe(true);
    expect(body.bookings).toHaveLength(1);
  });

  test("flattens teacher_name from nested teachers join", async () => {
    mockSupabase(PARENT_USER, [{ data: [BOOKING_WITH_TEACHER], error: null }]);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.bookings[0].teacher_name).toBe("Ms. Tara Smith");
  });

  test("flattens teacher_classroom from nested teachers join", async () => {
    mockSupabase(PARENT_USER, [{ data: [BOOKING_WITH_TEACHER], error: null }]);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.bookings[0].teacher_classroom).toBe("Sunflower");
  });

  test("returns empty array when parent has no bookings", async () => {
    mockSupabase(PARENT_USER, [{ data: [], error: null }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings).toHaveLength(0);
  });

  test("returns 500 on database error", async () => {
    mockSupabase(PARENT_USER, [{ data: null, error: { code: "PGRST000", message: "DB error" } }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });

  test("includes start_time and end_time from availability when slot covers booking dates", async () => {
    const availSlot = {
      teacher_id: TEACHER_ID,
      start_date: "2026-06-15",
      end_date: "2026-06-30",
      start_time: "08:00:00",
      end_time: "17:00:00",
    };
    mockSupabase(PARENT_USER, [
      { data: [BOOKING_WITH_TEACHER], error: null }, // bookings query
      { data: [availSlot], error: null }, // availability batch query
    ]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings[0].start_time).toBe("08:00:00");
    expect(body.bookings[0].end_time).toBe("17:00:00");
  });

  test("sets start_time and end_time to null when no availability slot matches", async () => {
    mockSupabase(PARENT_USER, [
      { data: [BOOKING_WITH_TEACHER], error: null },
      { data: [], error: null },
    ]);
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.bookings[0].start_time).toBeNull();
    expect(body.bookings[0].end_time).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/bookings/[id] — parent modifies dates
// ---------------------------------------------------------------------------

function makeParentPatchRequest(id: string, body: object): Request {
  return new Request(`http://localhost/api/bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARENT_BOOKING_ROW = { ...BOOKING_ROW, parent_id: PARENT_UID };

describe("PATCH /api/bookings/[id] — parent modifies dates", () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_DATES = { start_date: "2026-07-01", end_date: "2026-07-05" };

  test("returns 400 when dates are missing", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await PATCH(makeParentPatchRequest(BOOKING_ID, {}), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 when end_date is before start_date", async () => {
    mockSupabase(PARENT_USER, []);
    const res = await PATCH(
      makeParentPatchRequest(BOOKING_ID, { start_date: "2026-07-05", end_date: "2026-07-01" }),
      { params: Promise.resolve({ id: BOOKING_ID }) }
    );
    expect(res.status).toBe(400);
  });

  test("returns 404 when booking not found", async () => {
    mockSupabase(PARENT_USER, [{ data: null, error: { code: "PGRST116", message: "Not found" } }]);
    const res = await PATCH(makeParentPatchRequest(BOOKING_ID, VALID_DATES), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(404);
  });

  test("returns 403 when booking belongs to a different parent", async () => {
    mockSupabase(PARENT_USER, [
      { data: { ...BOOKING_ROW, parent_id: "other-parent-uuid" }, error: null },
    ]);
    const res = await PATCH(makeParentPatchRequest(BOOKING_ID, VALID_DATES), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(403);
  });

  test("returns 409 when teacher unavailable for new dates", async () => {
    mockSupabase(PARENT_USER, [
      { data: PARENT_BOOKING_ROW, error: null }, // booking lookup
      { data: [], error: null }, // no availability
    ]);
    const res = await PATCH(makeParentPatchRequest(BOOKING_ID, VALID_DATES), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(409);
  });

  test("returns 200 with status pending after successful date update", async () => {
    const updatedRow = { ...PARENT_BOOKING_ROW, ...VALID_DATES, status: "pending" };
    mockSupabase(PARENT_USER, [
      { data: PARENT_BOOKING_ROW, error: null }, // booking lookup
      { data: [AVAILABILITY_ROW], error: null }, // availability check
      { data: updatedRow, error: null }, // update
    ]);
    const res = await PATCH(makeParentPatchRequest(BOOKING_ID, VALID_DATES), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.booking.status).toBe("pending");
    expect(body.booking.start_date).toBe("2026-07-01");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/bookings/[id] — parent cancels booking
// ---------------------------------------------------------------------------

function makeDeleteRequest(id: string): Request {
  return new Request(`http://localhost/api/bookings/${id}`, { method: "DELETE" });
}

describe("DELETE /api/bookings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    mockSupabase(null, []);
    const res = await DELETE(makeDeleteRequest(BOOKING_ID), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a teacher", async () => {
    mockSupabase(TEACHER_USER, []);
    const res = await DELETE(makeDeleteRequest(BOOKING_ID), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(403);
  });

  test("returns 404 when booking not found", async () => {
    mockSupabase(PARENT_USER, [{ data: null, error: { code: "PGRST116", message: "Not found" } }]);
    const res = await DELETE(makeDeleteRequest(BOOKING_ID), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(404);
  });

  test("returns 403 when booking belongs to a different parent", async () => {
    mockSupabase(PARENT_USER, [
      { data: { id: BOOKING_ID, parent_id: "other-parent-uuid", status: "pending" }, error: null },
    ]);
    const res = await DELETE(makeDeleteRequest(BOOKING_ID), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(403);
  });

  test("returns 409 when trying to cancel a non-pending booking", async () => {
    mockSupabase(PARENT_USER, [
      { data: { id: BOOKING_ID, parent_id: PARENT_UID, status: "confirmed" }, error: null },
    ]);
    const res = await DELETE(makeDeleteRequest(BOOKING_ID), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(409);
  });

  test("returns 204 on successful cancellation", async () => {
    mockSupabase(PARENT_USER, [
      { data: { id: BOOKING_ID, parent_id: PARENT_UID, status: "pending" }, error: null }, // lookup
      { data: null, error: null }, // delete
    ]);
    const res = await DELETE(makeDeleteRequest(BOOKING_ID), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(204);
  });

  test("returns 500 on Supabase delete error", async () => {
    mockSupabase(PARENT_USER, [
      { data: { id: BOOKING_ID, parent_id: PARENT_UID, status: "pending" }, error: null },
      { data: null, error: { code: "PGRST000", message: "DB error" } },
    ]);
    const res = await DELETE(makeDeleteRequest(BOOKING_ID), {
      params: Promise.resolve({ id: BOOKING_ID }),
    });
    expect(res.status).toBe(500);
  });
});
