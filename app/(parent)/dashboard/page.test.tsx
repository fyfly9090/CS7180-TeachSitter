import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import DashboardPage from "./page";

// ── Next.js mocks ──────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: mockPush }),
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

const CHILDREN = [
  { id: "c1", name: "Lily", classroom: "Sunflower", age: 4, notes: "", created_at: "2026-01-01" },
  { id: "c2", name: "Oliver", classroom: "Butterfly", age: 3, notes: "", created_at: "2026-01-02" },
];

const AI_TEACHERS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "ms.clara@teachsitter.dev",
    full_name: "Ms. Clara H.",
    classroom: "Sunshine",
    bio: "Ms. Clara is Leo's primary teacher. She's already familiar with his afternoon routine.",
    availability: [
      { start_date: "2026-06-16", end_date: "2026-06-20", start_time: "09:00", end_time: "17:00" },
    ],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "ms.elena@teachsitter.dev",
    full_name: "Ms. Elena V.",
    classroom: "Little Sprouts",
    bio: "Maya responds exceptionally well to Elena during morning play.",
    availability: [
      { start_date: "2026-06-23", end_date: "2026-06-27", start_time: "08:00", end_time: "15:00" },
    ],
  },
];

const BOOKINGS = [
  {
    id: "b1",
    teacher_name: "Ms. Tara Smith",
    teacher_classroom: "Sunflower",
    start_date: "2026-06-16",
    end_date: "2026-06-20",
    start_time: "09:00:00",
    status: "pending",
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2h ago
  },
  {
    id: "b2",
    teacher_name: "Ms. Rachel Chen",
    teacher_classroom: "Butterfly",
    start_date: "2026-06-22",
    end_date: "2026-06-24",
    start_time: null,
    status: "confirmed",
    created_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
  },
];

function mockFetchChildren(children = CHILDREN) {
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (String(url).startsWith("/api/teachers/available")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ teachers: [] }) });
    }
    if (String(url) === "/api/bookings") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ bookings: [] }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ children }) });
  });
}

function mockFetchError() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: { code: "INTERNAL_ERROR", message: "Server error" } }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("DashboardPage — structure", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchChildren();
  });
  afterEach(() => vi.clearAllMocks());

  it("renders welcome heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/welcome back/i);
  });

  it("renders My Children section heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /my children/i })).toBeInTheDocument();
  });

  it("renders Quick Match AI sidebar heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /quick match ai/i })).toBeInTheDocument();
  });

  it("renders TeachSitter brand link", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("link", { name: /teachsitter/i })).toBeInTheDocument();
  });
});

describe("DashboardPage — search card", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchChildren();
  });
  afterEach(() => vi.clearAllMocks());

  it("renders date from input", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText(/date from/i)).toBeInTheDocument();
  });

  it("renders date to input", () => {
    render(<DashboardPage />);
    expect(screen.getByLabelText(/date to/i)).toBeInTheDocument();
  });

  it("renders classroom selector", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders Search Teachers button", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("button", { name: /search teachers/i })).toBeInTheDocument();
  });

  it("navigates to /search without params when no filters set", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /search teachers/i }));
    expect(mockPush).toHaveBeenCalledWith("/search?");
  });

  it("navigates to /search with start_date param", () => {
    render(<DashboardPage />);
    fireEvent.change(screen.getByLabelText(/date from/i), {
      target: { value: "2026-06-16" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search teachers/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("start_date=2026-06-16"));
  });

  it("navigates to /search with end_date param", () => {
    render(<DashboardPage />);
    fireEvent.change(screen.getByLabelText(/date to/i), {
      target: { value: "2026-06-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search teachers/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("end_date=2026-06-20"));
  });

  it("navigates to /search with classroom param when not 'All Classrooms'", () => {
    render(<DashboardPage />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Sunflower" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search teachers/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("classroom=Sunflower"));
  });

  it("does not include classroom param when 'All Classrooms' selected", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /search teachers/i }));
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("classroom="));
  });
});

describe("DashboardPage — children from API", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it("calls GET /api/children on mount", async () => {
    mockFetchChildren();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/children");
    });
  });

  it("shows children loaded from API", async () => {
    mockFetchChildren();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Lily")).toBeInTheDocument();
      expect(screen.getByText("Oliver")).toBeInTheDocument();
    });
  });

  it("shows child classroom badge from API", async () => {
    mockFetchChildren();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Sunflower").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows child age from API", async () => {
    mockFetchChildren();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/4 years old/i)).toBeInTheDocument();
    });
  });

  it("shows child notes from API", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          children: [
            {
              id: "c1",
              name: "Lily",
              classroom: "Sunflower",
              age: 4,
              notes: "Nut-free snacks only",
              created_at: "2026-01-01",
            },
          ],
        }),
    });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Nut-free snacks only")).toBeInTheDocument();
    });
  });

  it("shows empty state when API returns no children", async () => {
    mockFetchChildren([]);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/no children added yet/i)).toBeInTheDocument();
    });
  });
});

describe("DashboardPage — delete child", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it("shows an edit button on each child card", async () => {
    mockFetchChildren();
    render(<DashboardPage />);
    await waitFor(() => {
      const editBtns = screen.getAllByRole("button", { name: /edit/i });
      expect(editBtns.length).toBe(2);
    });
  });

  it("calls DELETE /api/children/:id when delete clicked inside edit modal", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: CHILDREN }) }) // GET children
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ bookings: [] }) }) // GET bookings
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teachers: [] }) }) // GET teachers
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // DELETE response

    render(<DashboardPage />);
    await waitFor(() => screen.getAllByRole("button", { name: /edit lily/i }));

    fireEvent.click(screen.getByRole("button", { name: /edit lily/i }));
    await waitFor(() => screen.getByRole("button", { name: /delete lily/i }));

    fireEvent.click(screen.getByRole("button", { name: /delete lily/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/children/c1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("removes child from list after successful delete", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: CHILDREN }) }) // GET children
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ bookings: [] }) }) // GET bookings
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teachers: [] }) }) // GET teachers
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) }); // DELETE

    render(<DashboardPage />);
    await waitFor(() => screen.getAllByRole("button", { name: /edit lily/i }));

    fireEvent.click(screen.getByRole("button", { name: /edit lily/i }));
    await waitFor(() => screen.getByRole("button", { name: /delete lily/i }));

    fireEvent.click(screen.getByRole("button", { name: /delete lily/i }));

    await waitFor(() => {
      expect(screen.queryByText("Lily")).not.toBeInTheDocument();
      expect(screen.getByText("Oliver")).toBeInTheDocument();
    });
  });
});

describe("DashboardPage — Add a Child modal", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchChildren([]);
  });
  afterEach(() => vi.clearAllMocks());

  it("shows an Add Child button", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("button", { name: /add child/i })).toBeInTheDocument();
  });

  it("modal is not visible before button click", () => {
    render(<DashboardPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a modal when Add Child button is clicked", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("modal contains a name field", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("modal contains an age field", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
  });

  it("modal contains a classroom field", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByLabelText(/classroom/i)).toBeInTheDocument();
  });

  it("modal contains a notes field", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("closes modal when Cancel is clicked", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls POST /api/children when Add Child form submitted", async () => {
    const newChild = {
      id: "c3",
      name: "Emma",
      classroom: "Rainbow",
      age: 2,
      notes: "",
      created_at: "2026-01-03",
    };
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) }) // GET children
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ bookings: [] }) }) // GET bookings
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teachers: [] }) }) // GET teachers
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ child: newChild }) }); // POST

    render(<DashboardPage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Emma" } });
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/classroom/i), { target: { value: "Rainbow" } });

    fireEvent.click(screen.getByRole("button", { name: /^add child$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/children",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Emma"),
        })
      );
    });
  });

  it("adds new child to list and closes modal after successful POST", async () => {
    const newChild = {
      id: "c3",
      name: "Emma",
      classroom: "Rainbow",
      age: 2,
      notes: "",
      created_at: "2026-01-03",
    };
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) }) // GET children
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ bookings: [] }) }) // GET bookings
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teachers: [] }) }) // GET teachers
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ child: newChild }) }); // POST

    render(<DashboardPage />);
    // Wait for initial GET to complete before submitting (avoids race with GET's setChildren)
    await waitFor(() => screen.getByText(/no children added yet/i));

    fireEvent.click(screen.getByRole("button", { name: /add child/i }));

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Emma" } });
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/classroom/i), { target: { value: "Rainbow" } });

    // Flush the POST chain: fetch → res.json → setState
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^add child$/i }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText("Emma")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DashboardPage — Quick Match AI sidebar", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).startsWith("/api/teachers/available")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teachers: AI_TEACHERS }),
        });
      }
      if (String(url) === "/api/bookings") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ bookings: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ children: CHILDREN }) });
    });
  });
  afterEach(() => vi.clearAllMocks());

  it("renders Quick Match AI heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /quick match ai/i })).toBeInTheDocument();
  });

  it("shows teacher names in sidebar", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Ms. Clara H.")).toBeInTheDocument();
      expect(screen.getByText("Ms. Elena V.")).toBeInTheDocument();
    });
  });

  it("shows Request buttons for each match", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /request ms\. clara/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /request ms\. elena/i })).toBeInTheDocument();
    });
  });

  it("shows View Profile buttons for each match", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const viewProfileBtns = screen.getAllByRole("button", { name: /view profile/i });
      expect(viewProfileBtns.length).toBe(2);
    });
  });

  it("Request button navigates to /bookings/new with real teacher UUID", async () => {
    render(<DashboardPage />);
    await waitFor(() => screen.getByRole("button", { name: /request ms\. clara/i }));
    fireEvent.click(screen.getByRole("button", { name: /request ms\. clara/i }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining(`teacher_id=${AI_TEACHERS[0].id}`)
    );
  });

  it("Request button includes teacher_name in URL", async () => {
    render(<DashboardPage />);
    await waitFor(() => screen.getByRole("button", { name: /request ms\. clara/i }));
    fireEvent.click(screen.getByRole("button", { name: /request ms\. clara/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("teacher_name="));
  });

  it("Request button includes availability in URL", async () => {
    render(<DashboardPage />);
    await waitFor(() => screen.getByRole("button", { name: /request ms\. clara/i }));
    fireEvent.click(screen.getByRole("button", { name: /request ms\. clara/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("availability="));
  });

  it("View Profile button navigates to /teachers/:id", async () => {
    render(<DashboardPage />);
    await waitFor(() => screen.getAllByRole("button", { name: /view profile/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /view profile/i })[0]);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining(`/teachers/${AI_TEACHERS[0].id}`)
    );
  });
});

describe("DashboardPage — Active Requests", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it("renders Active Requests heading", () => {
    mockFetchChildren();
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /active requests/i })).toBeInTheDocument();
  });

  it("calls GET /api/bookings on mount", async () => {
    mockFetchChildren();
    render(<DashboardPage />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/bookings");
    });
  });

  it("shows empty state when no bookings", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ bookings: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teachers: [] }) });

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/no active requests/i)).toBeInTheDocument();
    });
  });

  it("shows booking teacher name", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ bookings: BOOKINGS }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teachers: [] }) });

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/care with ms\. tara smith/i)).toBeInTheDocument();
    });
  });

  it("shows pending status badge", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ bookings: BOOKINGS }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teachers: [] }) });

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/^pending$/i)).toBeInTheDocument();
    });
  });

  it("shows confirmed status badge", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ bookings: BOOKINGS }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ teachers: [] }) });

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/^confirmed$/i)).toBeInTheDocument();
    });
  });
});
