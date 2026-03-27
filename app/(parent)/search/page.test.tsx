import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import SearchPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/search",
  useRouter: () => ({ push: vi.fn() }),
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

const mockTeachers = [
  {
    id: "teacher-1",
    user_id: "user-1",
    classroom: "Sunflower",
    bio: "5 years teaching preschool. Loves art.",
    created_at: "2026-01-01",
    name: "tara.smith@school.com",
    availability: [{ start_date: "2026-06-16", end_date: "2026-06-20" }],
  },
  {
    id: "teacher-2",
    user_id: "user-2",
    classroom: "Butterfly",
    bio: "Certified early childhood educator.",
    created_at: "2026-01-01",
    name: "rachel.chen@school.com",
    availability: [{ start_date: "2026-06-16", end_date: "2026-06-20" }],
  },
];

function mockFetchSuccess(teachers = mockTeachers) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ teachers }),
  });
}

describe("SearchPage — page header", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Find a familiar face" as the page heading', () => {
    render(<SearchPage />);
    expect(screen.getByRole("heading", { name: /find a familiar face/i })).toBeInTheDocument();
  });

  it("renders the correct page subtitle", () => {
    render(<SearchPage />);
    expect(screen.getByText(/teachers your child already knows/i)).toBeInTheDocument();
  });
});

describe("SearchPage — states", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading skeleton while fetching", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(<SearchPage />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("shows empty state when API returns no teachers", async () => {
    mockFetchSuccess([]);
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/No teachers available for these dates/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Try widening your date range/i)).toBeInTheDocument();
  });

  it("shows error state when API returns non-ok response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });

  it("shows error state when fetch throws a network error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });
});

describe("SearchPage — filter bar", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchSuccess([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function waitForInitialLoad() {
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  }

  function getLastFetchUrl() {
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    return calls[calls.length - 1][0] as string;
  }

  it("sends start_date and end_date params when Update Results is clicked", async () => {
    render(<SearchPage />);
    await waitForInitialLoad();

    fireEvent.change(screen.getByLabelText(/date from/i), { target: { value: "2026-06-16" } });
    fireEvent.change(screen.getByLabelText(/date to/i), { target: { value: "2026-06-20" } });
    fireEvent.click(screen.getByRole("button", { name: /update results/i }));

    await waitFor(() => {
      const url = getLastFetchUrl();
      expect(url).toContain("start_date=2026-06-16");
      expect(url).toContain("end_date=2026-06-20");
    });
  });

  it("sends classroom param when a specific classroom is selected", async () => {
    render(<SearchPage />);
    await waitForInitialLoad();

    fireEvent.change(screen.getByLabelText(/classroom/i), { target: { value: "Sunflower" } });
    fireEvent.click(screen.getByRole("button", { name: /update results/i }));

    await waitFor(() => {
      expect(getLastFetchUrl()).toContain("classroom=Sunflower");
    });
  });

  it("does not send classroom param when 'All Classrooms' is selected", async () => {
    render(<SearchPage />);
    await waitForInitialLoad();

    // Select a classroom, then switch back to "All Classrooms"
    fireEvent.change(screen.getByLabelText(/classroom/i), { target: { value: "Sunflower" } });
    fireEvent.change(screen.getByLabelText(/classroom/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /update results/i }));

    await waitFor(() => {
      expect(getLastFetchUrl()).not.toContain("classroom=");
    });
  });
});

describe("SearchPage — teacher cards", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchSuccess();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function waitForCards() {
    await waitFor(() => expect(screen.getByText("Sunflower Class")).toBeInTheDocument());
  }

  it("renders teacher name from API response", async () => {
    render(<SearchPage />);
    await waitForCards();
    expect(screen.getByText("tara.smith@school.com")).toBeInTheDocument();
    expect(screen.getByText("rachel.chen@school.com")).toBeInTheDocument();
  });

  it("renders classroom as '{classroom} Class'", async () => {
    render(<SearchPage />);
    await waitForCards();
    expect(screen.getByText("Sunflower Class")).toBeInTheDocument();
    expect(screen.getByText("Butterfly Class")).toBeInTheDocument();
  });

  it("renders bio snippet", async () => {
    render(<SearchPage />);
    await waitForCards();
    expect(screen.getByText("5 years teaching preschool. Loves art.")).toBeInTheDocument();
    expect(screen.getByText("Certified early childhood educator.")).toBeInTheDocument();
  });

  it("renders formatted availability dates", async () => {
    render(<SearchPage />);
    await waitForCards();
    // Jun 16 – Jun 20 (formatted by formatDateRange)
    const dateRanges = screen.getAllByText(/jun 16/i);
    expect(dateRanges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders verified badge on each teacher card", async () => {
    render(<SearchPage />);
    await waitForCards();
    const badges = screen.getAllByText("Verified");
    expect(badges).toHaveLength(2);
  });

  it("renders avatar with computed initials", async () => {
    render(<SearchPage />);
    await waitForCards();
    // tara.smith@school.com → "TS", rachel.chen@school.com → "RC"
    expect(screen.getByText("TS")).toBeInTheDocument();
    expect(screen.getByText("RC")).toBeInTheDocument();
  });

  it("renders 'View Profile' button on each teacher card", async () => {
    render(<SearchPage />);
    await waitForCards();
    const viewProfileButtons = screen.getAllByRole("button", { name: /view profile/i });
    expect(viewProfileButtons).toHaveLength(2);
  });
});

describe("SearchPage — Request Booking navigation", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("'Request Booking' links to /bookings/new with teacher_id", async () => {
    mockFetchSuccess();
    render(<SearchPage />);
    await waitFor(() => screen.getByText("Sunflower Class"));

    const links = screen.getAllByRole("link", { name: /request booking/i });
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("/bookings/new"));
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("teacher_id=teacher-1"));
    expect(links[1]).toHaveAttribute("href", expect.stringContaining("teacher_id=teacher-2"));
  });

  it("'Request Booking' includes date filter params in href when dates are set", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ teachers: mockTeachers }),
    });
    render(<SearchPage />);

    // Set date filters
    fireEvent.change(screen.getByLabelText(/date from/i), { target: { value: "2026-06-16" } });
    fireEvent.change(screen.getByLabelText(/date to/i), { target: { value: "2026-06-20" } });
    fireEvent.click(screen.getByRole("button", { name: /update results/i }));

    await waitFor(() => screen.getByText("Sunflower Class"));

    const links = screen.getAllByRole("link", { name: /request booking/i });
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("start_date=2026-06-16"));
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("end_date=2026-06-20"));
  });
});

describe("SearchPage — AI reasoning box", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("omits AI reasoning box when teacher has no reasoning", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ teachers: mockTeachers }),
    });
    render(<SearchPage />);
    await waitFor(() => screen.getByText("Sunflower Class"));
    expect(screen.queryByTestId("ai-reasoning")).not.toBeInTheDocument();
  });

  it("renders AI reasoning box with text when teacher has reasoning", async () => {
    const teachersWithReasoning = [
      { ...mockTeachers[0], reasoning: "Same classroom as child — highest familiarity." },
    ];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ teachers: teachersWithReasoning }),
    });
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByTestId("ai-reasoning")).toBeInTheDocument();
    });
    expect(screen.getByText("Same classroom as child — highest familiarity.")).toBeInTheDocument();
  });

  it('renders "AI Match Reasoning" label inside the reasoning box', async () => {
    const teachersWithReasoning = [{ ...mockTeachers[0], reasoning: "Same classroom as child." }];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ teachers: teachersWithReasoning }),
    });
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByTestId("ai-reasoning")).toBeInTheDocument();
    });
    expect(screen.getByText(/ai match reasoning/i)).toBeInTheDocument();
  });
});
