/**
 * Unit tests for SearchClient — the "use client" component that renders the
 * search page UI. SearchPage (server component) fetches data and passes it as
 * props; these tests drive SearchClient directly with mock props.
 */

// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import SearchClient from "./SearchClient";

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

const BASE_TEACHER = {
  id: "teacher-1",
  user_id: "user-1",
  classroom: "Sunflower",
  bio: "5 years teaching preschool. Loves art.",
  hourly_rate: 45,
  full_name: "Ms. Tara Smith",
  position: "Preschool Teacher",
  created_at: "2026-01-01",
  name: "tara.smith@school.com",
  availability: [
    {
      start_date: "2026-06-16",
      end_date: "2026-06-20",
      start_time: "16:00:00",
      end_time: "20:00:00",
    },
  ],
};

const BASE_TEACHER_2 = {
  id: "teacher-2",
  user_id: "user-2",
  classroom: "Butterfly",
  bio: "Certified early childhood educator.",
  hourly_rate: null,
  full_name: null,
  position: null,
  created_at: "2026-01-01",
  name: "rachel.chen@school.com",
  availability: [
    { start_date: "2026-06-16", end_date: "2026-06-20", start_time: null, end_time: null },
  ],
};

const DEFAULT_PROPS = {
  initialTeachers: [BASE_TEACHER, BASE_TEACHER_2],
  initialError: false,
  initialDateFrom: "2026-06-16",
  initialDateTo: "2026-06-20",
  initialClassroom: "",
};

describe("SearchClient — page header", () => {
  it('renders "Find a familiar face" as the page heading', () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getByRole("heading", { name: /find a familiar face/i })).toBeInTheDocument();
  });

  it("renders the correct page subtitle", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getByText(/teachers your child already knows/i)).toBeInTheDocument();
  });
});

describe("SearchClient — states", () => {
  it("shows empty state when no teachers", () => {
    render(<SearchClient {...DEFAULT_PROPS} initialTeachers={[]} />);
    expect(screen.getByText(/No teachers available for these dates/i)).toBeInTheDocument();
    expect(screen.getByText(/Try widening your date range/i)).toBeInTheDocument();
  });

  it("shows error state when initialError is true", () => {
    render(<SearchClient {...DEFAULT_PROPS} initialTeachers={[]} initialError={true} />);
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });
});

describe("SearchClient — teacher cards", () => {
  it("renders full_name when provided", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getByText("Ms. Tara Smith")).toBeInTheDocument();
  });

  it("falls back to email-derived name when full_name is null", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    // rachel.chen@school.com → "Rachel Chen"
    expect(screen.getByText("Rachel Chen")).toBeInTheDocument();
  });

  it("renders position • classroom on second line", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getByText("Preschool Teacher • Sunflower")).toBeInTheDocument();
  });

  it("falls back to 'Preschool Teacher' when position is null", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getByText("Preschool Teacher • Butterfly")).toBeInTheDocument();
  });

  it("renders bio snippet", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getByText("5 years teaching preschool. Loves art.")).toBeInTheDocument();
    expect(screen.getByText("Certified early childhood educator.")).toBeInTheDocument();
  });

  it("renders teacher portrait img with alt text", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getByAltText("Ms. Tara Smith portrait")).toBeInTheDocument();
    expect(screen.getByAltText("Rachel Chen portrait")).toBeInTheDocument();
  });

  it("renders Verified badge on each card", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getAllByText("Verified")).toHaveLength(2);
  });

  it("renders View Profile button on each card", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getAllByRole("button", { name: /view profile/i })).toHaveLength(2);
  });
});

describe("SearchClient — hourly rate and availability times", () => {
  it("shows $45/hour when hourly_rate is set", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.getByText(/\$45/)).toBeInTheDocument();
  });

  it("does not show rate when hourly_rate is null", () => {
    render(<SearchClient {...DEFAULT_PROPS} initialTeachers={[BASE_TEACHER_2]} />);
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("shows formatted availability times when start_time and end_time are set", () => {
    render(<SearchClient {...DEFAULT_PROPS} initialTeachers={[BASE_TEACHER]} />);
    expect(screen.getByText(/4pm/i)).toBeInTheDocument();
  });

  it("hides time row when start_time is null", () => {
    render(<SearchClient {...DEFAULT_PROPS} initialTeachers={[BASE_TEACHER_2]} />);
    expect(screen.queryByText(/pm/i)).not.toBeInTheDocument();
  });
});

describe("SearchClient — AI reasoning box", () => {
  afterEach(() => vi.restoreAllMocks());

  it("omits AI reasoning box when teacher has no reasoning", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    expect(screen.queryByTestId("ai-reasoning")).not.toBeInTheDocument();
  });

  it("renders AI reasoning box with text when teacher has reasoning", () => {
    const withReasoning = [
      { ...BASE_TEACHER, reasoning: "Same classroom as child — highest familiarity." },
    ];
    render(<SearchClient {...DEFAULT_PROPS} initialTeachers={withReasoning} />);
    expect(screen.getByTestId("ai-reasoning")).toBeInTheDocument();
    expect(screen.getByText("Same classroom as child — highest familiarity.")).toBeInTheDocument();
  });

  it('renders "AI Match Reasoning" label inside the reasoning box', () => {
    const withReasoning = [{ ...BASE_TEACHER, reasoning: "Same classroom as child." }];
    render(<SearchClient {...DEFAULT_PROPS} initialTeachers={withReasoning} />);
    expect(screen.getByText(/ai match reasoning/i)).toBeInTheDocument();
  });
});

describe("SearchClient — booking link", () => {
  it("'Book [name]' link navigates to /bookings/new with teacher_id", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    const links = screen.getAllByRole("link", { name: /^book \w/i });
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("/bookings/new"));
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("teacher_id=teacher-1"));
  });

  it("booking link teacher_name uses display name (full_name if set)", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    const links = screen.getAllByRole("link", { name: /^book \w/i });
    expect(links[0]).toHaveAttribute(
      "href",
      expect.stringContaining("teacher_name=Ms.%20Tara%20Smith")
    );
  });

  it("booking link includes date params from props", () => {
    render(<SearchClient {...DEFAULT_PROPS} />);
    const links = screen.getAllByRole("link", { name: /^book \w/i });
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("start_date=2026-06-16"));
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("end_date=2026-06-20"));
  });
});
