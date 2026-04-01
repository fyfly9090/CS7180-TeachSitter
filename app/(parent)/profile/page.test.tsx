import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("ProfilePage — header card", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders parent name in header", () => {
    render(<ProfilePage />);
    expect(screen.getByText(/patricia johnson/i)).toBeInTheDocument();
  });

  it("renders school name in header", () => {
    render(<ProfilePage />);
    expect(screen.getByText(/sunshine preschool/i)).toBeInTheDocument();
  });

  it("renders role badge 'Parent'", () => {
    render(<ProfilePage />);
    expect(screen.getByText(/^parent$/i)).toBeInTheDocument();
  });

  it("renders avatar initials PJ", () => {
    render(<ProfilePage />);
    expect(screen.getByText("PJ")).toBeInTheDocument();
  });
});

describe("ProfilePage — children section", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders My Children heading", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: /my children/i })).toBeInTheDocument();
  });

  it("shows child name Lily", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Lily")).toBeInTheDocument();
  });

  it("shows child name Oliver", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Oliver")).toBeInTheDocument();
  });

  it("shows Lily's classroom badge", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Sunflower")).toBeInTheDocument();
  });

  it("shows Oliver's classroom badge", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Butterfly")).toBeInTheDocument();
  });

  it("shows Lily's age", () => {
    render(<ProfilePage />);
    expect(screen.getByText(/age 4/i)).toBeInTheDocument();
  });

  it("shows Oliver's age", () => {
    render(<ProfilePage />);
    expect(screen.getByText(/age 3/i)).toBeInTheDocument();
  });

  it("renders Edit buttons for each child", () => {
    render(<ProfilePage />);
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
  });
});

describe("ProfilePage — Add a Child modal", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders Add a Child button", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("button", { name: /add a child/i })).toBeInTheDocument();
  });

  it("modal is not visible before button click", () => {
    render(<ProfilePage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a modal when Add a Child is clicked", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add a child/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("modal contains a name field", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add a child/i }));
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("modal contains an age field", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add a child/i }));
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
  });

  it("modal contains a classroom field", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add a child/i }));
    expect(screen.getByLabelText(/classroom/i)).toBeInTheDocument();
  });

  it("closes modal when Cancel is clicked", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /add a child/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ProfilePage — account settings", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders Account Settings heading", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: /account settings/i })).toBeInTheDocument();
  });

  it("renders disabled email input", () => {
    render(<ProfilePage />);
    const emailInput = screen.getByDisplayValue("patricia@example.com");
    expect(emailInput).toBeDisabled();
  });

  it("renders current password field", () => {
    render(<ProfilePage />);
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
  });

  it("renders new password field", () => {
    render(<ProfilePage />);
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
  });

  it("renders Save Changes button", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});

describe("ProfilePage — form validation", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows validation error when new password is too short", () => {
    render(<ProfilePage />);
    const newPwInput = screen.getByLabelText(/new password/i);
    const saveBtn = screen.getByRole("button", { name: /save changes/i });

    fireEvent.change(newPwInput, { target: { value: "abc" } });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("shows validation error when new password filled but current is empty", () => {
    render(<ProfilePage />);
    const newPwInput = screen.getByLabelText(/new password/i);
    const saveBtn = screen.getByRole("button", { name: /save changes/i });

    fireEvent.change(newPwInput, { target: { value: "newpassword123" } });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
  });

  it("no validation error when both fields are empty (no-op save)", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/current password is required/i)).not.toBeInTheDocument();
  });

  it("no validation error when both passwords are valid", () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "oldpassword123" },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/current password is required/i)).not.toBeInTheDocument();
  });
});
