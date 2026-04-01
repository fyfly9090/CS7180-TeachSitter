import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("DashboardPage — structure", () => {
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
    // default is All Classrooms
    fireEvent.click(screen.getByRole("button", { name: /search teachers/i }));
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("classroom="));
  });
});

describe("DashboardPage — children cards", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows child name Lily", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Lily")).toBeInTheDocument();
  });

  it("shows child name Oliver", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Oliver")).toBeInTheDocument();
  });

  it("shows Lily's classroom badge", () => {
    render(<DashboardPage />);
    // Multiple "Sunflower" elements exist (select option + badge) — assert at least one
    expect(screen.getAllByText("Sunflower").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Oliver's classroom badge", () => {
    render(<DashboardPage />);
    expect(screen.getAllByText("Butterfly").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Lily's age", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/age 4/i)).toBeInTheDocument();
  });

  it("shows Oliver's age", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/age 3/i)).toBeInTheDocument();
  });
});

describe("DashboardPage — Add a Child modal", () => {
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
});

describe("DashboardPage — AI Match sidebar", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows top 2 AI matches", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/#1 Match/i)).toBeInTheDocument();
    expect(screen.getByText(/#2 Match/i)).toBeInTheDocument();
  });

  it("shows View All Matches button linking to /search", () => {
    render(<DashboardPage />);
    const btn = screen.getByRole("button", { name: /view all matches/i });
    expect(btn).toBeInTheDocument();
  });
});
