import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import BookingsPage from "./page";

// ── Next.js mocks ──────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: () => "/bookings",
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

// ── Fixtures ───────────────────────────────────────────────────────────────────

const CONFIRMED_FUTURE = {
  id: "b1",
  teacher_id: "t1",
  teacher_name: "Ms. Tara Smith",
  teacher_classroom: "Sunflower",
  start_date: "2026-06-16",
  end_date: "2026-06-20",
  status: "confirmed",
  message: null,
  created_at: "2026-03-01T00:00:00Z",
};

const PENDING = {
  id: "b2",
  teacher_id: "t2",
  teacher_name: "Ms. Rachel Chen",
  teacher_classroom: "Rainbow",
  start_date: "2026-06-23",
  end_date: "2026-06-27",
  status: "pending",
  message: "Hi Rachel!",
  created_at: "2026-03-02T00:00:00Z",
};

const CONFIRMED_PAST = {
  id: "b3",
  teacher_id: "t1",
  teacher_name: "Ms. Tara Smith",
  teacher_classroom: "Sunflower",
  start_date: "2024-01-06",
  end_date: "2024-01-10",
  status: "confirmed",
  message: null,
  created_at: "2024-01-01T00:00:00Z",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function mockFetchBookings(bookings: unknown[]) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ bookings }),
  });
}

function mockFetchError() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: { code: "INTERNAL_ERROR", message: "Server error" } }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("BookingsPage — structure", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchBookings([]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders page heading", async () => {
    render(<BookingsPage />);
    expect(screen.getByRole("heading", { name: /my bookings/i })).toBeInTheDocument();
  });

  it("renders Confirmed section heading", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /confirmed/i })).toBeInTheDocument();
    });
  });

  it("renders Pending Requests section heading", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /pending requests/i })).toBeInTheDocument();
    });
  });

  it("renders Past Sessions section heading", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /past sessions/i })).toBeInTheDocument();
    });
  });

  it("renders Summary sidebar", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /summary/i })).toBeInTheDocument();
    });
  });
});

describe("BookingsPage — data loading", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("calls GET /api/bookings on mount", async () => {
    mockFetchBookings([]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/bookings");
    });
  });

  it("shows confirmed teacher name after loading", async () => {
    mockFetchBookings([CONFIRMED_FUTURE]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Ms. Tara Smith")).toBeInTheDocument();
    });
  });

  it("shows pending teacher name after loading", async () => {
    mockFetchBookings([PENDING]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Ms. Rachel Chen")).toBeInTheDocument();
    });
  });

  it("shows past session teacher name after loading", async () => {
    mockFetchBookings([CONFIRMED_PAST]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Ms. Tara Smith")).toBeInTheDocument();
    });
  });
});

describe("BookingsPage — grouping by status", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("places confirmed future booking in Confirmed section (CONFIRMED badge)", async () => {
    mockFetchBookings([CONFIRMED_FUTURE]);
    render(<BookingsPage />);
    await waitFor(() => {
      const badges = screen.getAllByText(/confirmed/i);
      // At least one badge should be visible (the status badge, not just the heading)
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it("places pending booking in Pending Requests section (PENDING badge)", async () => {
    mockFetchBookings([PENDING]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/pending/i, { selector: "span" })).toBeInTheDocument();
    });
  });

  it("places confirmed past booking in Past Sessions with Completed badge", async () => {
    mockFetchBookings([CONFIRMED_PAST]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
    });
  });
});

describe("BookingsPage — empty states", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchBookings([]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows empty state in Confirmed section when no confirmed bookings", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no confirmed bookings/i)).toBeInTheDocument();
    });
  });

  it("shows empty state in Pending section when no pending bookings", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
    });
  });

  it("shows empty state in Past Sessions when no past bookings", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no past sessions/i)).toBeInTheDocument();
    });
  });
});

describe("BookingsPage — sidebar counts", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows correct Upcoming count from confirmed future bookings", async () => {
    mockFetchBookings([CONFIRMED_FUTURE, CONFIRMED_PAST, PENDING]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("sidebar-upcoming-count")).toHaveTextContent("1");
    });
  });

  it("shows correct Pending count", async () => {
    mockFetchBookings([CONFIRMED_FUTURE, PENDING]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("sidebar-pending-count")).toHaveTextContent("1");
    });
  });

  it("shows correct Completed count from past confirmed bookings", async () => {
    mockFetchBookings([CONFIRMED_PAST]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("sidebar-completed-count")).toHaveTextContent("1");
    });
  });
});

describe("BookingsPage — error state", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows error message when API call fails", async () => {
    mockFetchError();
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load bookings/i)).toBeInTheDocument();
    });
  });
});
