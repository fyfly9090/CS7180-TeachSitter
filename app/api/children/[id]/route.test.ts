// @vitest-environment node
import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Supabase mock ──────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

function resetChain() {
  mockFrom.mockReturnValue({ select: mockSelect, delete: mockDelete });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
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

function makeRequest(id: string): Request {
  return new Request(`http://localhost/api/children/${id}`, { method: "DELETE" });
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("DELETE /api/children/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  it("returns 401 when unauthenticated", async () => {
    const { DELETE } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await DELETE(makeRequest("c1"), makeCtx("c1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is a teacher", async () => {
    const { DELETE } = await import("./route");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "t1", user_metadata: { role: "teacher" } } },
    });

    const res = await DELETE(makeRequest("c1"), makeCtx("c1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when child does not exist or belongs to another parent", async () => {
    const { DELETE } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: makeParentUser() } });
    // ownership check returns no row
    mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    const res = await DELETE(makeRequest("c1"), makeCtx("c1"));
    expect(res.status).toBe(404);
  });

  it("returns 204 on successful delete", async () => {
    const { DELETE } = await import("./route");
    mockGetUser.mockResolvedValue({ data: { user: makeParentUser() } });

    // First from() call — ownership check: select().eq().eq().single()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "c1", parent_id: "parent-uuid" },
              error: null,
            }),
          }),
        }),
      }),
    });
    // Second from() call — delete: delete().eq()
    mockFrom.mockReturnValueOnce({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await DELETE(makeRequest("c1"), makeCtx("c1"));
    expect(res.status).toBe(204);
  });
});
