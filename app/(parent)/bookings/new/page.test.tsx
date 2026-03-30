import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import NewBookingPage from "./page";

// ── Next.js mocks ──────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(
      "teacher_id=teacher-1&teacher_name=tara.smith%40school.com&classroom=Sunflower&start_date=2026-06-16&end_date=2026-06-20"
    ),
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/bookings/new",
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown = {}) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    status: 201,
    json: () => Promise.resolve(body),
  });
}

function mockFetchError(status: number, code: string, message: string) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: { code, message } }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("NewBookingPage — page display", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page heading", () => {
    render(<NewBookingPage />);
    expect(screen.getByRole("heading", { name: /request a booking/i })).toBeInTheDocument();
  });

  it("displays teacher name from query params", () => {
    render(<NewBookingPage />);
    expect(screen.getByText(/tara\.smith@school\.com/i)).toBeInTheDocument();
  });

  it("displays classroom from query params", () => {
    render(<NewBookingPage />);
    expect(screen.getByText(/sunflower class/i)).toBeInTheDocument();
  });

  it("pre-fills start date input from query params", () => {
    render(<NewBookingPage />);
    expect(screen.getByLabelText(/start date/i)).toHaveValue("2026-06-16");
  });

  it("pre-fills end date input from query params", () => {
    render(<NewBookingPage />);
    expect(screen.getByLabelText(/end date/i)).toHaveValue("2026-06-20");
  });

  it("renders message textarea", () => {
    render(<NewBookingPage />);
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<NewBookingPage />);
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeInTheDocument();
  });
});

describe("NewBookingPage — missing teacher_id guard", () => {
  beforeEach(() => {
    vi.resetModules(); // must clear cache BEFORE doMock
    vi.doMock("next/navigation", () => ({
      useSearchParams: () => new URLSearchParams(""),
      useRouter: () => ({ push: mockPush }),
      usePathname: () => "/bookings/new",
    }));
    vi.doMock("next/link", () => ({
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
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an error when teacher_id is missing from URL", async () => {
    const { default: NewBookingPageNoId } = await import("./page");
    render(<NewBookingPageNoId />);
    expect(screen.getByText(/invalid booking link/i)).toBeInTheDocument();
  });
});

describe("NewBookingPage — form submission", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockPush.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /api/bookings with correct body on submit", async () => {
    mockFetchOk({
      booking: {
        id: "booking-1",
        parent_id: "parent-1",
        teacher_id: "teacher-1",
        start_date: "2026-06-16",
        end_date: "2026-06-20",
        status: "pending",
      },
    });
    render(<NewBookingPage />);

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/bookings",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: expect.stringContaining('"teacher_id":"teacher-1"'),
        })
      );
    });

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.start_date).toBe("2026-06-16");
    expect(body.end_date).toBe("2026-06-20");
  });

  it("includes message in request body when provided", async () => {
    mockFetchOk({
      booking: {
        id: "booking-1",
        parent_id: "parent-1",
        teacher_id: "teacher-1",
        start_date: "2026-06-16",
        end_date: "2026-06-20",
        status: "pending",
      },
    });
    render(<NewBookingPage />);

    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Hi Tara, my daughter loves your class!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(call[1].body as string);
      expect(body.message).toBe("Hi Tara, my daughter loves your class!");
    });
  });

  it("redirects to /bookings on successful submission", async () => {
    mockFetchOk({
      booking: {
        id: "booking-1",
        parent_id: "parent-1",
        teacher_id: "teacher-1",
        start_date: "2026-06-16",
        end_date: "2026-06-20",
        status: "pending",
      },
    });
    render(<NewBookingPage />);

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/bookings");
    });
  });

  it("shows unavailable error on 409 response", async () => {
    mockFetchError(409, "CONFLICT", "Teacher unavailable for requested dates");
    render(<NewBookingPage />);

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/teacher unavailable for requested dates/i)).toBeInTheDocument();
    });
  });

  it("shows generic error on network failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    render(<NewBookingPage />);

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it("disables the submit button while submitting", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(<NewBookingPage />);

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sending request/i })).toBeDisabled();
    });
  });
});
