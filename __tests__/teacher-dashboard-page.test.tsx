// TDD RED → GREEN: TeacherDashboardPage — fetch on mount, display, accept/decline flow

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  usePathname: () => "/teacher/dashboard",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Import component under test
// ---------------------------------------------------------------------------

import TeacherDashboardPage from "../app/teacher/dashboard/page";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEACHER_ROW = {
  id: "teacher-1",
  user_id: "uid-1",
  classroom: "Sunflower",
  bio: "Great teacher.",
  full_name: "Ms. Tara Smith",
  position: "Preschool Teacher",
  hourly_rate: null,
  created_at: "2026-01-01T00:00:00Z",
};

const CONFIRMED_BOOKING = {
  id: "booking-1",
  parent_id: "parent-1",
  teacher_id: "teacher-1",
  start_date: "2026-06-16",
  end_date: "2026-06-20",
  status: "confirmed",
  message: null,
  created_at: "2026-01-01T00:00:00Z",
};

const PENDING_BOOKING = {
  id: "booking-2",
  parent_id: "parent-1",
  teacher_id: "teacher-1",
  start_date: "2026-07-01",
  end_date: "2026-07-05",
  status: "pending",
  message: "Can you watch my son?",
  created_at: "2026-01-02T00:00:00Z",
  parent_email: "patricia.johnson@example.com",
  parent_display_name: "Patricia Johnson",
};

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetchSuccess(confirmed = [CONFIRMED_BOOKING], pending = [PENDING_BOOKING]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/teachers/me" && (!opts?.method || opts.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teacher: TEACHER_ROW }),
        });
      }
      if (url === "/api/teachers/me/bookings" && (!opts?.method || opts.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ confirmed, pending }),
        });
      }
      // PATCH /api/bookings/[id]
      if (url.includes("/api/bookings/") && opts?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ booking: { id: "booking-2", status: "confirmed" } }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Not found" } }),
      });
    })
  );
}

function mockFetchError() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}

function mockFetchPatchError() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/teachers/me") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teacher: TEACHER_ROW }),
        });
      }
      if (url === "/api/teachers/me/bookings") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ confirmed: [CONFIRMED_BOOKING], pending: [PENDING_BOOKING] }),
        });
      }
      // PATCH fails
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      });
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeacherDashboardPage — loading & error", () => {
  afterEach(() => vi.restoreAllMocks());

  test("shows loading spinner while fetching", () => {
    // Never-resolving fetch to keep loading state
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<TeacherDashboardPage />);
    expect(screen.getByText("progress_activity")).toBeInTheDocument();
  });

  test("shows error banner when fetch fails", async () => {
    mockFetchError();
    render(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/unable to load/i)).toBeInTheDocument();
    });
  });
});

describe("TeacherDashboardPage — data display", () => {
  beforeEach(() => mockFetchSuccess());
  afterEach(() => vi.restoreAllMocks());

  test("renders teacher name in greeting", async () => {
    render(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/ms\. tara smith/i)).toBeInTheDocument();
    });
  });

  test("shows correct counts in stats cards", async () => {
    render(<TeacherDashboardPage />);
    await waitFor(() => {
      // Both stat cards should show "1" (1 confirmed + 1 pending)
      const statValues = screen.getAllByText("1").filter((el) => el.className.includes("text-4xl"));
      expect(statValues).toHaveLength(2);
    });
  });

  test("renders confirmed session with formatted date range", async () => {
    render(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/jun 16/i)).toBeInTheDocument();
    });
  });

  test("renders pending request with parent name and message", async () => {
    render(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Patricia Johnson")).toBeInTheDocument();
      expect(screen.getByText(/watch my son/i)).toBeInTheDocument();
    });
  });
});

describe("TeacherDashboardPage — empty states", () => {
  afterEach(() => vi.restoreAllMocks());

  test("shows empty state for sessions when none exist", async () => {
    mockFetchSuccess([], [PENDING_BOOKING]);
    render(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/no upcoming sessions/i)).toBeInTheDocument();
    });
  });

  test("shows empty state for requests when none exist", async () => {
    mockFetchSuccess([CONFIRMED_BOOKING], []);
    render(<TeacherDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
    });
  });
});

describe("TeacherDashboardPage — accept/decline", () => {
  afterEach(() => vi.restoreAllMocks());

  test("Accept button calls PATCH with status confirmed", async () => {
    mockFetchSuccess();
    render(<TeacherDashboardPage />);
    await waitFor(() => screen.getByText("Patricia Johnson"));

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch);
      const patchCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          typeof url === "string" &&
          url.includes("/api/bookings/") &&
          (opts as RequestInit)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string) as {
        status: string;
      };
      expect(body.status).toBe("confirmed");
    });
  });

  test("Decline button calls PATCH with status declined", async () => {
    mockFetchSuccess();
    render(<TeacherDashboardPage />);
    await waitFor(() => screen.getByText("Patricia Johnson"));

    fireEvent.click(screen.getByRole("button", { name: /decline/i }));

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch);
      const patchCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          typeof url === "string" &&
          url.includes("/api/bookings/") &&
          (opts as RequestInit)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string) as {
        status: string;
      };
      expect(body.status).toBe("declined");
    });
  });

  test("reverts optimistic update on PATCH failure", async () => {
    mockFetchPatchError();
    render(<TeacherDashboardPage />);
    await waitFor(() => screen.getByText("Patricia Johnson"));

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    // Request card should reappear after failure
    await waitFor(() => {
      expect(screen.getByText("Patricia Johnson")).toBeInTheDocument();
      expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
    });
  });
});
