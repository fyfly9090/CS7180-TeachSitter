// TDD RED: TeacherLayout — shared navbar + mobile bottom nav

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPathname = "/teacher/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
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

// ---------------------------------------------------------------------------
// Import component under test
// ---------------------------------------------------------------------------

import TeacherLayout from "../app/teacher/layout";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeacherLayout — navbar", () => {
  test("renders all desktop nav links", () => {
    render(
      <TeacherLayout>
        <div>child</div>
      </TeacherLayout>
    );
    // "Dashboard" appears in both desktop + mobile nav, so use getAllByText
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Booking Requests")).toBeInTheDocument();
    expect(screen.getByText("My Profile")).toBeInTheDocument();
  });

  test("renders TeachSitter logo link", () => {
    render(
      <TeacherLayout>
        <div>child</div>
      </TeacherLayout>
    );
    const logo = screen.getByText("TeachSitter");
    expect(logo.closest("a")).toHaveAttribute("href", "/teacher/dashboard");
  });

  test("renders children", () => {
    render(
      <TeacherLayout>
        <div>page content</div>
      </TeacherLayout>
    );
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});

describe("TeacherLayout — mobile bottom nav", () => {
  test("renders mobile nav items", () => {
    render(
      <TeacherLayout>
        <div>child</div>
      </TeacherLayout>
    );
    // Mobile nav uses short labels
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });
});
