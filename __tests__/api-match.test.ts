// @vitest-environment node
// TDD RED → GREEN: POST /api/match
// Tests cover: auth, validation, AI race (Gemini wins / Claude wins / both fail), eval logging.

import { describe, test, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — before any imports that pull these modules
// ---------------------------------------------------------------------------

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("../lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("../lib/ai/gemini", () => ({
  rankTeachers: vi.fn(),
}));

vi.mock("../lib/ai/claude", () => ({
  rankTeachers: vi.fn(),
}));

// Keep matchTeachers as a real deterministic fallback (no AI needed)
vi.mock("../lib/ai/match", () => ({
  matchTeachers: vi.fn().mockResolvedValue([
    {
      id: "550e8400-e29b-41d4-a716-446655440010",
      name: "Tara",
      rank: 1,
      reasoning: "Same classroom.",
    },
  ]),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createServerClient } from "../lib/supabase/server";
import { rankTeachers as rankGemini } from "../lib/ai/gemini";
import { rankTeachers as rankClaude } from "../lib/ai/claude";
import { POST } from "../app/api/match/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PARENT_UID = "550e8400-e29b-41d4-a716-446655440001";
const TEACHER_UID = "550e8400-e29b-41d4-a716-446655440002";
const EVAL_ID = "550e8400-e29b-41d4-a716-446655440099";
const T1_ID = "550e8400-e29b-41d4-a716-446655440010";
const T2_ID = "550e8400-e29b-41d4-a716-446655440011";

const PARENT_USER = { id: PARENT_UID, user_metadata: { role: "parent" } };
const TEACHER_USER = { id: TEACHER_UID, user_metadata: { role: "teacher" } };

const TEACHERS_INPUT = [
  { id: T1_ID, name: "Tara Smith", classroom: "Sunflower", bio: "Loves art." },
  { id: T2_ID, name: "Bob Jones", classroom: "Rose", bio: "Loves music." },
];

const RANKED_RESULT = [
  { id: T1_ID, name: "Tara Smith", rank: 1, reasoning: "Same classroom as child." },
  { id: T2_ID, name: "Bob Jones", rank: 2, reasoning: "Different classroom." },
];

const VALID_BODY = {
  parent_id: PARENT_UID,
  child_classroom: "Sunflower",
  start_date: "2026-06-16",
  end_date: "2026-06-20",
  teachers: TEACHERS_INPUT,
};

/** Mock createServerClient: auth user + from() chain for match_evals insert */
function mockSupabase(user: object | null, evalInsertData: object | null = { id: EVAL_ID }) {
  const insertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: evalInsertData, error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    // make update().eq() awaitable (for judge)
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };
  vi.mocked(createServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue(insertChain),
  } as never);
  return insertChain;
}

function makePostRequest(body: object): Request {
  return new Request("http://localhost/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Auth + input validation
// ---------------------------------------------------------------------------

describe("POST /api/match — auth + validation", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 401 when unauthenticated", async () => {
    mockSupabase(null);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  test("returns 403 when user is a teacher (not parent)", async () => {
    mockSupabase(TEACHER_USER);
    const res = await POST(makePostRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  test("returns 400 when parent_id is missing", async () => {
    mockSupabase(PARENT_USER);
    const { child_classroom, start_date, end_date, teachers } = VALID_BODY;
    const res = await POST(makePostRequest({ child_classroom, start_date, end_date, teachers }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_INPUT");
  });

  test("returns 400 when child_classroom is missing", async () => {
    mockSupabase(PARENT_USER);
    const { parent_id, start_date, end_date, teachers } = VALID_BODY;
    const res = await POST(makePostRequest({ parent_id, start_date, end_date, teachers }));
    expect(res.status).toBe(400);
  });

  test("returns 400 when teachers array is empty", async () => {
    mockSupabase(PARENT_USER);
    const res = await POST(makePostRequest({ ...VALID_BODY, teachers: [] }));
    expect(res.status).toBe(400);
  });

  test("returns 400 when end_date is before start_date", async () => {
    mockSupabase(PARENT_USER);
    const res = await POST(
      makePostRequest({ ...VALID_BODY, start_date: "2026-06-20", end_date: "2026-06-16" })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when a teacher bio exceeds 2000 chars", async () => {
    mockSupabase(PARENT_USER);
    const res = await POST(
      makePostRequest({
        ...VALID_BODY,
        teachers: [{ ...TEACHERS_INPUT[0], bio: "x".repeat(2001) }],
      })
    );
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AI race + response shape
// ---------------------------------------------------------------------------

describe("POST /api/match — AI race", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns 200 with ranked_teachers and eval_id when Gemini wins", async () => {
    mockSupabase(PARENT_USER);
    vi.mocked(rankGemini).mockResolvedValue(RANKED_RESULT);
    vi.mocked(rankClaude).mockResolvedValue(RANKED_RESULT);

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ranked_teachers).toHaveLength(2);
    expect(body.eval_id).toBe(EVAL_ID);
  });

  test("returns 200 when Claude wins (Gemini rejects)", async () => {
    mockSupabase(PARENT_USER);
    vi.mocked(rankGemini).mockRejectedValue(new Error("Gemini unavailable"));
    vi.mocked(rankClaude).mockResolvedValue(RANKED_RESULT);

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ranked_teachers).toHaveLength(2);
  });

  test("returns 200 with fallback deterministic ranking when both AI providers fail", async () => {
    mockSupabase(PARENT_USER);
    vi.mocked(rankGemini).mockRejectedValue(new Error("Gemini down"));
    vi.mocked(rankClaude).mockRejectedValue(new Error("Claude down"));

    const res = await POST(makePostRequest(VALID_BODY));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ranked_teachers).toHaveLength(1); // matchTeachers mock returns 1
    expect(body.eval_id).toBe(EVAL_ID);
  });

  test("ranked_teachers has id, name, rank, and reasoning fields", async () => {
    mockSupabase(PARENT_USER);
    vi.mocked(rankGemini).mockResolvedValue(RANKED_RESULT);
    vi.mocked(rankClaude).mockResolvedValue(RANKED_RESULT);

    const res = await POST(makePostRequest(VALID_BODY));
    const body = await res.json();
    const first = body.ranked_teachers[0];

    expect(first).toMatchObject({
      id: expect.any(String),
      rank: expect.any(Number),
      reasoning: expect.any(String),
    });
  });
});

// ---------------------------------------------------------------------------
// eval logging
// ---------------------------------------------------------------------------

describe("POST /api/match — eval logging", () => {
  beforeEach(() => vi.clearAllMocks());

  test("inserts a match_evals row on every successful call", async () => {
    const chain = mockSupabase(PARENT_USER);
    vi.mocked(rankGemini).mockResolvedValue(RANKED_RESULT);
    vi.mocked(rankClaude).mockResolvedValue(RANKED_RESULT);

    await POST(makePostRequest(VALID_BODY));

    expect(chain.insert).toHaveBeenCalledOnce();
    const insertArg = vi.mocked(chain.insert).mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.parent_id).toBe(PARENT_UID);
    expect(insertArg.ranked_teachers).toEqual(RANKED_RESULT);
  });

  test("eval_id in response matches the inserted row id", async () => {
    mockSupabase(PARENT_USER, { id: "abc-eval-123" });
    vi.mocked(rankGemini).mockResolvedValue(RANKED_RESULT);
    vi.mocked(rankClaude).mockResolvedValue(RANKED_RESULT);

    const res = await POST(makePostRequest(VALID_BODY));
    const body = await res.json();

    expect(body.eval_id).toBe("abc-eval-123");
  });
});
