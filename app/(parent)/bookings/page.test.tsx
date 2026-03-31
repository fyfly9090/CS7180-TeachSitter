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
  teacher_id: "550e8400-e29b-41d4-a716-446655440010",
  teacher_name: "Ms. Tara Smith",
  teacher_classroom: "Sunflower",
  start_date: "2026-06-16",
  end_date: "2026-06-20",
  start_time: "08:00:00",
  end_time: "17:00:00",
  status: "confirmed",
  message: null,
  created_at: "2026-03-01T00:00:00Z",
};

const PENDING = {
  id: "b2",
  teacher_id: "550e8400-e29b-41d4-a716-446655440011",
  teacher_name: "Ms. Rachel Chen",
  teacher_classroom: "Rainbow",
  start_date: "2026-06-23",
  end_date: "2026-06-27",
  start_time: null,
  end_time: null,
  status: "pending",
  message: "Hi Rachel!",
  created_at: "2026-03-02T00:00:00Z",
};

const CONFIRMED_PAST = {
  id: "b3",
  teacher_id: "550e8400-e29b-41d4-a716-446655440010",
  teacher_name: "Ms. Tara Smith",
  teacher_classroom: "Sunflower",
  start_date: "2024-01-06",
  end_date: "2024-01-10",
  start_time: null,
  end_time: null,
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

  it("renders page heading", () => {
    render(<BookingsPage />);
    expect(screen.getByRole("heading", { name: /my bookings/i })).toBeInTheDocument();
  });

  it("renders Confirmed section heading after load", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /confirmed/i })).toBeInTheDocument();
    });
  });

  it("renders Pending Requests section heading after load", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /pending requests/i })).toBeInTheDocument();
    });
  });

  it("renders Past History sidebar heading after load", async () => {
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /past history/i })).toBeInTheDocument();
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

  it("shows past session teacher name in Past History sidebar", async () => {
    mockFetchBookings([CONFIRMED_PAST]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Ms. Tara Smith")).toBeInTheDocument();
    });
  });
});

describe("BookingsPage — booking card UI", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows teacher photo img element in booking card", async () => {
    mockFetchBookings([CONFIRMED_FUTURE]);
    render(<BookingsPage />);
    await waitFor(() => {
      const img = screen.getByRole("img", { name: /ms\. tara smith/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", expect.stringContaining("/teachers/teacher-"));
    });
  });

  it("shows formatted date range in booking card", async () => {
    mockFetchBookings([CONFIRMED_FUTURE]);
    render(<BookingsPage />);
    await waitFor(() => {
      // Expect something like "Jun 16 - Jun 20"
      expect(screen.getByText(/jun 16/i)).toBeInTheDocument();
    });
  });

  it("shows formatted time range when start_time and end_time are present", async () => {
    mockFetchBookings([CONFIRMED_FUTURE]);
    render(<BookingsPage />);
    await waitFor(() => {
      // "08:00:00" → "08:00 AM", "17:00:00" → "05:00 PM"
      expect(screen.getByText(/08:00 AM/i)).toBeInTheDocument();
    });
  });

  it("shows CONFIRMED badge for confirmed future booking", async () => {
    mockFetchBookings([CONFIRMED_FUTURE]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/confirmed/i).length).toBeGreaterThan(0);
    });
  });

  it("shows PENDING badge for pending booking", async () => {
    mockFetchBookings([PENDING]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
    });
  });

  it("shows Message button", async () => {
    mockFetchBookings([CONFIRMED_FUTURE]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /message/i })).toBeInTheDocument();
    });
  });

  it("shows Modify Booking button for confirmed booking", async () => {
    mockFetchBookings([CONFIRMED_FUTURE]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /modify booking/i })).toBeInTheDocument();
    });
  });
});

describe("BookingsPage — Past History sidebar", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows Completed text in Past History sidebar for past booking", async () => {
    mockFetchBookings([CONFIRMED_PAST]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
  });

  it("shows duration in Past History sidebar", async () => {
    mockFetchBookings([CONFIRMED_PAST]);
    render(<BookingsPage />);
    await waitFor(() => {
      // 2024-01-06 to 2024-01-10 = 5 days, no times → "5 days"
      expect(screen.getByText(/5 days/i)).toBeInTheDocument();
    });
  });

  it("shows empty state in Past History when no past bookings", async () => {
    mockFetchBookings([]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no past sessions yet/i)).toBeInTheDocument();
    });
  });

  it("shows download History Report button", async () => {
    mockFetchBookings([]);
    render(<BookingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /download history report/i })).toBeInTheDocument();
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
