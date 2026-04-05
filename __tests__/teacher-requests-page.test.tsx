import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeacherRequestsPage from "@/app/teacher/requests/page";
import type { BookingWithParent } from "@/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/teacher/requests",
  useRouter: () => ({ push: vi.fn() }),
}));

const mockConfirmed: BookingWithParent[] = [
  {
    id: "b1",
    parent_id: "p1",
    teacher_id: "t1",
    start_date: "2026-06-16",
    end_date: "2026-06-20",
    status: "confirmed",
    message: null,
    created_at: "2026-06-01T00:00:00Z",
    parent_email: "alice@example.com",
    parent_display_name: "Alice Smith",
  },
];

const mockPending: BookingWithParent[] = [
  {
    id: "b2",
    parent_id: "p2",
    teacher_id: "t1",
    start_date: "2026-07-01",
    end_date: "2026-07-05",
    status: "pending",
    message: "Looking for help during summer break!",
    created_at: "2026-06-15T00:00:00Z",
    parent_email: "bob.jones@example.com",
    parent_display_name: "Bob Jones",
  },
];

function mockFetchSuccess() {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        confirmed: mockConfirmed,
        pending: mockPending,
      }),
  } as Response);
}

describe("TeacherRequestsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading spinner initially", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise(() => {}));
    render(<TeacherRequestsPage />);
    expect(screen.getByText("progress_activity")).toBeDefined();
  });

  it("renders confirmed and pending bookings after fetch", async () => {
    mockFetchSuccess();
    render(<TeacherRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    expect(screen.getByText("Bob Jones")).toBeDefined();
    expect(screen.getByText(/Looking for help during summer break/)).toBeDefined();

    // Stats cards rendered
    expect(screen.getByText("Confirmed Bookings")).toBeDefined();
    expect(screen.getByText("Upcoming Bookings")).toBeDefined();
  });

  it("shows empty states when no bookings exist", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ confirmed: [], pending: [] }),
    } as Response);

    render(<TeacherRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("No upcoming bookings.")).toBeDefined();
    });
    expect(screen.getByText("No pending requests.")).toBeDefined();
  });

  it("calls PATCH with confirmed status when Accept is clicked", async () => {
    const user = userEvent.setup();
    mockFetchSuccess();

    render(<TeacherRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Jones")).toBeDefined();
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ booking: { id: "b2", status: "confirmed" } }),
    } as Response);

    await user.click(screen.getByRole("button", { name: /accept/i }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/bookings/b2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed" }),
    });
  });

  it("calls PATCH with declined status when Decline is clicked", async () => {
    const user = userEvent.setup();
    mockFetchSuccess();

    render(<TeacherRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Jones")).toBeDefined();
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ booking: { id: "b2", status: "declined" } }),
    } as Response);

    await user.click(screen.getByRole("button", { name: /decline/i }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/bookings/b2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "declined" }),
    });
  });

  it("shows error banner when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    render(<TeacherRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText(/unable to load/i)).toBeDefined();
    });
  });
});
