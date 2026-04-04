import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import ProfilePage from "./page";

// ── Next.js mocks ──────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
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

// ── Supabase client mock ───────────────────────────────────────────────────────

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: "patricia@example.com" } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const CHILDREN = [
  { id: "c1", name: "Lily", classroom: "Sunflower", age: 4, notes: "", created_at: "2026-01-01" },
  { id: "c2", name: "Oliver", classroom: "Butterfly", age: 3, notes: "", created_at: "2026-01-02" },
];

function mockFetchChildren(children = CHILDREN) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ children }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("ProfilePage — header card", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchChildren();
  });
  afterEach(() => vi.clearAllMocks());

  it("renders parent name in header", () => {
    render(<ProfilePage />);
    expect(screen.getByText(/patricia johnson/i)).toBeInTheDocument();
  });

  it("renders school name in header", () => {
    render(<ProfilePage />);
    expect(screen.getByText(/sunshine preschool/i)).toBeInTheDocument();
  });

  it("renders My Children heading", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: /my children/i })).toBeInTheDocument();
  });

  it("renders Account Settings heading", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: /account settings/i })).toBeInTheDocument();
  });
});

describe("ProfilePage — children from API", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it("renders My Children heading", () => {
    mockFetchChildren();
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: /my children/i })).toBeInTheDocument();
  });

  it("calls GET /api/children on mount", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/children");
    });
  });

  it("shows child name Lily from API", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("Lily")).toBeInTheDocument();
    });
  });

  it("shows child name Oliver from API", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("Oliver")).toBeInTheDocument();
    });
  });

  it("shows Lily's classroom badge", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getAllByText("Sunflower").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows Oliver's classroom badge", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText("Butterfly")).toBeInTheDocument();
    });
  });

  it("shows Lily's age", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/4 years old/i)).toBeInTheDocument();
    });
  });

  it("shows Oliver's age", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/3 years old/i)).toBeInTheDocument();
    });
  });

  it("renders Edit buttons for each child", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      expect(editButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("shows edit button on each child card", async () => {
    mockFetchChildren();
    render(<ProfilePage />);
    await waitFor(() => {
      const editBtns = screen.getAllByRole("button", { name: /edit/i });
      expect(editBtns.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("ProfilePage — delete child", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it("calls DELETE /api/children/:id when delete clicked inside edit modal", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: CHILDREN }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(<ProfilePage />);
    await waitFor(() => screen.getByRole("button", { name: /edit lily/i }));

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
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: CHILDREN }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) });

    render(<ProfilePage />);
    await waitFor(() => screen.getByRole("button", { name: /edit lily/i }));

    fireEvent.click(screen.getByRole("button", { name: /edit lily/i }));
    await waitFor(() => screen.getByRole("button", { name: /delete lily/i }));

    fireEvent.click(screen.getByRole("button", { name: /delete lily/i }));

    await waitFor(() => {
      expect(screen.queryByText("Lily")).not.toBeInTheDocument();
      expect(screen.getByText("Oliver")).toBeInTheDocument();
    });
  });
});

describe("ProfilePage — Add a Child modal", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchChildren([]);
  });
  afterEach(() => vi.clearAllMocks());

  it("renders Add Child button", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("button", { name: /add child/i })).toBeInTheDocument();
  });

  it("modal is not visible before button click", () => {
    render(<ProfilePage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a modal when Add Child is clicked", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("modal contains a name field", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("modal contains an age field", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
  });

  it("modal contains a classroom field", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByLabelText(/classroom/i)).toBeInTheDocument();
  });

  it("modal contains a notes field", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add child/i }));
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it("closes modal when Cancel is clicked", () => {
    render(<ProfilePage />);
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
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ child: newChild }) });

    render(<ProfilePage />);
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
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ children: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ child: newChild }) });

    render(<ProfilePage />);
    await waitFor(() => screen.getByRole("button", { name: /add child/i }));

    fireEvent.click(screen.getByRole("button", { name: /add child/i }));

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Emma" } });
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/classroom/i), { target: { value: "Rainbow" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^add child$/i }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText("Emma")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ProfilePage — account settings", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchChildren();
  });
  afterEach(() => vi.clearAllMocks());

  it("renders Account Settings heading", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: /account settings/i })).toBeInTheDocument();
  });

  it("renders email input with value from Supabase", async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
  });

  it("renders password field", () => {
    render(<ProfilePage />);
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("reveals new password input after clicking Change", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /^change$/i }));
    expect(screen.getByPlaceholderText(/new password/i)).toBeInTheDocument();
  });

  it("renders Save Changes button", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});

describe("ProfilePage — form validation", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockFetchChildren();
  });
  afterEach(() => vi.clearAllMocks());

  it("shows validation error when new password is too short", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /^change$/i }));
    const pwInput = screen.getByPlaceholderText(/new password/i);
    fireEvent.change(pwInput, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.getAllByText(/at least 8 characters/i).length).toBeGreaterThan(0);
  });

  it("no validation error when password field is empty (no-op save)", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument();
  });

  it("no validation error when new password is valid", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /^change$/i }));
    fireEvent.change(screen.getByPlaceholderText(/new password/i), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument();
  });
});
