// TDD RED → GREEN: TeacherSetupPage component — fetch on mount, form interactions, save flow

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  usePathname: () => "/teacher/setup",
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
// Import component under test (after mocks)
// ---------------------------------------------------------------------------

import TeacherSetupPage from "../app/teacher/setup/page";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEACHER_ID = "550e8400-e29b-41d4-a716-446655440010";

const TEACHER_ROW = {
  id: TEACHER_ID,
  user_id: "550e8400-e29b-41d4-a716-446655440002",
  classroom: "Rainbow Room",
  bio: "Experienced teacher who loves STEM.",
  expertise: ["Art & Crafts", "STEM Activities"],
  hourly_rate: null,
  full_name: "Ms. Tara Smith",
  position: "Preschool Teacher",
  created_at: "2026-01-01T00:00:00Z",
};

const AVAIL_ROWS = [
  {
    id: "avail-1",
    teacher_id: TEACHER_ID,
    start_date: "2026-06-16",
    end_date: "2026-06-20",
    start_time: null,
    end_time: null,
    is_booked: false,
    created_at: "2026-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetchSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      // GET /api/teachers/me
      if (url === "/api/teachers/me" && (!opts?.method || opts.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teacher: TEACHER_ROW, availability: AVAIL_ROWS }),
        });
      }
      // PATCH /api/teachers/[id]
      if (url === `/api/teachers/${TEACHER_ID}` && opts?.method === "PATCH") {
        const body = JSON.parse(opts.body as string) as { classroom: string };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teacher: { ...TEACHER_ROW, classroom: body.classroom } }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Not found" } }),
      });
    })
  );
}

function mockFetchSaveError() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/teachers/me" && (!opts?.method || opts.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teacher: TEACHER_ROW, availability: AVAIL_ROWS }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Something went wrong." } }),
      });
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TeacherSetupPage — profile load on mount", () => {
  beforeEach(() => mockFetchSuccess());
  afterEach(() => vi.restoreAllMocks());

  test("renders classroom name fetched from API (not hardcoded)", async () => {
    render(<TeacherSetupPage />);
    // Should NOT show the old hardcoded value "Sunflower Room"
    await waitFor(() => {
      const input = screen.getByLabelText(/classroom name/i) as HTMLInputElement;
      expect(input.value).toBe("Rainbow Room");
    });
  });

  test("renders bio fetched from API on mount", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => {
      const textarea = screen.getByLabelText(/about you/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe("Experienced teacher who loves STEM.");
    });
  });

  test("renders pre-selected expertise pills from API data", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => {
      // "Art & Crafts" should be selected (bg-primary class)
      const artBtn = screen.getByRole("button", { name: "Art & Crafts" });
      expect(artBtn.className).toContain("bg-primary");
    });
  });

  test("renders non-selected expertise pills without selected style", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => {
      // "Outdoor Play" is NOT in the fetched expertise → should not be selected
      const outdoorBtn = screen.getByRole("button", { name: "Outdoor Play" });
      expect(outdoorBtn.className).not.toContain("bg-primary");
    });
  });

  test("renders availability blocks from API on mount", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => {
      // Should show a date input with value from AVAIL_ROWS
      const dateInputs = screen.getAllByDisplayValue("2026-06-16");
      expect(dateInputs.length).toBeGreaterThan(0);
    });
  });
});

describe("TeacherSetupPage — form interactions", () => {
  beforeEach(() => mockFetchSuccess());
  afterEach(() => vi.restoreAllMocks());

  test("typing in classroom input updates its value", async () => {
    render(<TeacherSetupPage />);
    const input = await screen.findByLabelText(/classroom name/i);
    fireEvent.change(input, { target: { value: "Sunflower Room" } });
    expect((input as HTMLInputElement).value).toBe("Sunflower Room");
  });

  test("clicking an unselected expertise pill adds it to selected set", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByRole("button", { name: "Outdoor Play" }));

    const outdoorBtn = screen.getByRole("button", { name: "Outdoor Play" });
    expect(outdoorBtn.className).not.toContain("bg-primary");

    fireEvent.click(outdoorBtn);
    expect(outdoorBtn.className).toContain("bg-primary");
  });

  test("clicking a selected expertise pill removes it from selected set", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => {
      const artBtn = screen.getByRole("button", { name: "Art & Crafts" });
      expect(artBtn.className).toContain("bg-primary");
    });

    const artBtn = screen.getByRole("button", { name: "Art & Crafts" });
    fireEvent.click(artBtn);
    expect(artBtn.className).not.toContain("bg-primary");
  });

  test("clicking Add availability inserts a new empty block", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByLabelText(/add availability block/i));

    const addBtn = screen.getByLabelText(/add availability block/i);
    const removesBefore = screen.getAllByText(/remove/i).length;

    fireEvent.click(addBtn);
    const removesAfter = screen.getAllByText(/remove/i).length;
    expect(removesAfter).toBe(removesBefore + 1);
  });

  test("clicking Remove on a block removes it from the DOM", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getAllByText(/remove/i));

    const removeBtns = screen.getAllByText(/remove/i);
    const countBefore = removeBtns.length;

    fireEvent.click(removeBtns[0]);
    const countAfter = screen.queryAllByText(/remove/i).length;
    expect(countAfter).toBe(countBefore - 1);
  });
});

describe("TeacherSetupPage — save flow", () => {
  afterEach(() => vi.restoreAllMocks());

  test("Save Profile calls PATCH with correct payload", async () => {
    mockFetchSuccess();
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByDisplayValue("Rainbow Room"));

    // Change classroom
    const input = screen.getByLabelText(/classroom name/i);
    fireEvent.change(input, { target: { value: "Updated Room" } });

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch);
      const patchCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          typeof url === "string" &&
          url.includes(`/api/teachers/${TEACHER_ID}`) &&
          (opts as RequestInit)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string) as {
        classroom: string;
      };
      expect(body.classroom).toBe("Updated Room");
    });
  });

  test("shows Saved! feedback after successful save", async () => {
    mockFetchSuccess();
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByDisplayValue("Rainbow Room"));

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saved!/i })).toBeInTheDocument();
    });
  });

  test("shows inline error when classroom is empty and Save is clicked", async () => {
    mockFetchSuccess();
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByDisplayValue("Rainbow Room"));

    // Clear the classroom input
    const input = screen.getByLabelText(/classroom name/i);
    fireEvent.change(input, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/classroom name is required/i)).toBeInTheDocument();
    });
  });

  test("does not call PATCH when classroom is empty", async () => {
    mockFetchSuccess();
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByDisplayValue("Rainbow Room"));

    const input = screen.getByLabelText(/classroom name/i);
    fireEvent.change(input, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    const fetchMock = vi.mocked(fetch);
    const patchCalls = fetchMock.mock.calls.filter(
      ([url, opts]) =>
        typeof url === "string" &&
        url.includes("/api/teachers/") &&
        (opts as RequestInit)?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);
  });

  test("shows error when teacherId is null (profile failed to load)", async () => {
    // GET returns ok:true but no teacher row — teacherId stays null
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (url === "/api/teachers/me" && (!opts?.method || opts.method === "GET")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ availability: AVAIL_ROWS }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByLabelText(/classroom name/i));

    // Fill in classroom and ensure availability is present so other validation passes
    fireEvent.change(screen.getByLabelText(/classroom name/i), {
      target: { value: "Sunflower Room" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/profile not found/i)).toBeInTheDocument();
    });
  });

  test("shows error message when PATCH API returns an error", async () => {
    mockFetchSaveError();
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByDisplayValue("Rainbow Room"));

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  test("PATCH payload includes availability blocks", async () => {
    mockFetchSuccess();
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByDisplayValue("Rainbow Room"));

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch);
      const patchCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          typeof url === "string" &&
          url.includes(`/api/teachers/${TEACHER_ID}`) &&
          (opts as RequestInit)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string) as {
        availability: { start_date: string; end_date: string }[];
      };
      expect(body.availability).toEqual([{ start_date: "2026-06-16", end_date: "2026-06-20" }]);
    });
  });
});

describe("TeacherSetupPage — availability validation", () => {
  beforeEach(() => mockFetchSuccess());
  afterEach(() => vi.restoreAllMocks());

  test("shows error when all availability blocks are removed before saving", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getAllByText(/remove/i));

    // Remove the pre-loaded block
    fireEvent.click(screen.getAllByText(/remove/i)[0]);

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least one availability block is required/i)).toBeInTheDocument();
    });
  });

  test("shows error when a block has empty dates", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getByLabelText(/add availability block/i));

    // Add a new block (empty dates), then remove the pre-loaded one
    fireEvent.click(screen.getByLabelText(/add availability block/i));
    fireEvent.click(screen.getAllByText(/remove/i)[0]);

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/both a start and end date/i)).toBeInTheDocument();
    });
  });

  test("does not call PATCH when availability validation fails", async () => {
    render(<TeacherSetupPage />);
    await waitFor(() => screen.getAllByText(/remove/i));

    fireEvent.click(screen.getAllByText(/remove/i)[0]);
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    const fetchMock = vi.mocked(fetch);
    const patchCalls = fetchMock.mock.calls.filter(
      ([url, opts]) =>
        typeof url === "string" &&
        url.includes("/api/teachers/") &&
        (opts as RequestInit)?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);
  });
});

describe("TeacherSetupPage — load error", () => {
  afterEach(() => vi.restoreAllMocks());

  test("shows error banner when profile load fails with network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    render(<TeacherSetupPage />);
    await waitFor(() => {
      expect(screen.getByText(/unable to load your profile/i)).toBeInTheDocument();
    });
  });
});
