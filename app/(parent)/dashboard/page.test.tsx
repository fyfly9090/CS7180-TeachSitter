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
  { id: "c1", name: "Lily", classroom: "Sunflower", age: 4, created_at: "2026-01-01" },
  { id: "c2", name: "Oliver", classroom: "Butterfly", age: 3, created_at: "2026-01-02" },
];

function mockFetchChildren(children = CHILDREN) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ children }),
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

  it("renders AI Match sidebar heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /ai match/i })).toBeInTheDocument();
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
      expect(screen.getByText(/age 4/i)).toBeInTheDocument();
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

  it("shows a delete button on each child card", async () => {
    mockFetchChildren();
    render(<DashboardPage />);
    await waitFor(() => {
      const deleteBtns = screen.getAllByRole("button", { name: /delete/i });
      expect(deleteBtns.length).toBe(2);
    });
  });

  it("calls DELETE /api/children/:id when delete clicked", async () => {
    mockFetchChildren();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: CHILDREN }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // DELETE response

    render(<DashboardPage />);
    await waitFor(() => screen.getAllByRole("button", { name: /delete/i }));

    fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/children/c1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("removes child from list after successful delete", async () => {
    mockFetchChildren();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: CHILDREN }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) });

    render(<DashboardPage />);
    await waitFor(() => screen.getAllByRole("button", { name: /delete/i }));

    fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);

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
      created_at: "2026-01-03",
    };
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) }) // initial load
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
      created_at: "2026-01-03",
    };
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ child: newChild }) });

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

describe("DashboardPage — AI Match sidebar", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchChildren();
  });
  afterEach(() => vi.clearAllMocks());

  it("shows top 2 AI matches", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/#1 Match/i)).toBeInTheDocument();
    expect(screen.getByText(/#2 Match/i)).toBeInTheDocument();
  });

  it("shows View All Matches button", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("button", { name: /view all matches/i })).toBeInTheDocument();
  });
});
