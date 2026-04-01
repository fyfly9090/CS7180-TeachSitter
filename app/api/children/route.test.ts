// @vitest-environment node
import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Supabase mock ──────────────────────────────────────────────────────────────
// We build a chainable mock that records what was called and returns configured
// results. Reset per-test with mockReset().

const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

// Chain: from().select().eq().order() → { data, error }
// Chain: from().insert().select().single() → { data, error }
// Chain: from().delete().eq() → { error }

function resetChain() {
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  });
  // select() used in GET: select().eq().order()
  // select() used in POST after insert: insert().select().single()
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle });
  mockEq.mockReturnValue({ order: mockOrder, eq: mockEq, single: mockSingle });
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockDelete.mockReturnValue({ eq: mockEq });
}

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: () => {} }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeParentUser(id = "parent-uuid") {
  return { id, user_metadata: { role: "parent" } };
}

function makeRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/children", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/children", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is a teacher", async () => {
    const { GET } = await import("./route");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "t1", user_metadata: { role: "teacher" } } },
    });

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(403);
  });

  it("returns 200 with children list", async () => {
    const { GET } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: makeParentUser() } });
    mockOrder.mockResolvedValue({
      data: [{ id: "c1", name: "Lily", classroom: "Sunflower", age: 4, created_at: "2026-01-01" }],
      error: null,
    });

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.children).toHaveLength(1);
    expect(body.children[0].name).toBe("Lily");
  });

  it("returns 500 on DB error", async () => {
    const { GET } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: makeParentUser() } });
    mockOrder.mockResolvedValue({ data: null, error: { message: "db error" } });

    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/children", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  it("returns 401 when unauthenticated", async () => {
    const { POST } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest("POST", { name: "Lily", classroom: "Sunflower", age: 4 }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is a teacher", async () => {
    const { POST } = await import("./route");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "t1", user_metadata: { role: "teacher" } } },
    });

    const res = await POST(makeRequest("POST", { name: "Lily", classroom: "Sunflower", age: 4 }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing name", async () => {
    const { POST } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: makeParentUser() } });

    const res = await POST(makeRequest("POST", { classroom: "Sunflower", age: 4 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for age out of range", async () => {
    const { POST } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: makeParentUser() } });

    const res = await POST(makeRequest("POST", { name: "Lily", classroom: "Sunflower", age: 15 }));
    expect(res.status).toBe(400);
  });

  it("returns 201 with created child on success", async () => {
    const { POST } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: makeParentUser() } });
    mockSingle.mockResolvedValue({
      data: {
        id: "c1",
        parent_id: "parent-uuid",
        name: "Lily",
        classroom: "Sunflower",
        age: 4,
        created_at: "2026-01-01",
      },
      error: null,
    });

    const res = await POST(makeRequest("POST", { name: "Lily", classroom: "Sunflower", age: 4 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.child.name).toBe("Lily");
    expect(body.child.id).toBe("c1");
  });

  it("returns 500 on DB insert error", async () => {
    const { POST } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: makeParentUser() } });
    mockSingle.mockResolvedValue({ data: null, error: { message: "insert error" } });

    const res = await POST(makeRequest("POST", { name: "Lily", classroom: "Sunflower", age: 4 }));
    expect(res.status).toBe(500);
  });
});
