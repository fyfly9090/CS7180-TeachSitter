/**
 * E2E visual demo — Parent Search UI
 *
 * Auth is handled by globalSetup (creates one confirmed parent account,
 * signs in, saves storageState). All tests here start already authenticated.
 *
 * Teachers API is mocked via page.route() so we always see rich card data.
 */

import { test, expect, type Page } from "@playwright/test";

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TEACHERS = [
  {
    id: "teacher-1",
    user_id: "user-1",
    classroom: "Sunflower",
    bio: "5 years teaching preschool. Loves art, music, and outdoor play.",
    created_at: "2026-01-01",
    name: "tara.smith@school.com",
    availability: [{ start_date: "2026-06-16", end_date: "2026-06-20" }],
    reasoning: "Same classroom as child — highest familiarity score.",
  },
  {
    id: "teacher-2",
    user_id: "user-2",
    classroom: "Butterfly",
    bio: "Certified early childhood educator with a passion for STEM activities.",
    created_at: "2026-01-01",
    name: "rachel.chen@school.com",
    availability: [{ start_date: "2026-06-16", end_date: "2026-06-27" }],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function mockTeachersApi(page: Page, teachers = MOCK_TEACHERS) {
  await page.route("**/api/teachers/available**", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ teachers }),
    });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Parent Search UI — visual demo", () => {
  test("/search — teacher cards with AI reasoning", async ({ page }) => {
    await mockTeachersApi(page);
    await page.goto("/search");

    await expect(page.getByText("Sunflower Class")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Butterfly Class")).toBeVisible();
    await expect(page.getByText(/AI Match Reasoning/i)).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/01-search-results.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/01-search-results.png");
  });

  test("/search — filter by date range", async ({ page }) => {
    await mockTeachersApi(page);
    await page.goto("/search");

    await expect(page.getByText("Sunflower Class")).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/date from/i).fill("2026-06-16");
    await page.getByLabel(/date to/i).fill("2026-06-20");
    await page.getByRole("button", { name: /update results/i }).click();

    await expect(page.getByText("Sunflower Class")).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: "e2e/screenshots/02-search-filtered.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/02-search-filtered.png");
  });

  test("/search — empty state", async ({ page }) => {
    await page.route("**/api/teachers/available**", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ teachers: [] }),
      });
    });

    await page.goto("/search");
    await expect(page.getByText(/no teachers available/i)).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: "e2e/screenshots/03-search-empty.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/03-search-empty.png");
  });

  test("/bookings/new — booking request form", async ({ page }) => {
    await mockTeachersApi(page);
    await page.goto("/search");

    await expect(page.getByText("Sunflower Class")).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/date from/i).fill("2026-06-16");
    await page.getByLabel(/date to/i).fill("2026-06-20");
    await page.getByRole("button", { name: /update results/i }).click();

    await expect(page.getByText("Sunflower Class")).toBeVisible({ timeout: 5_000 });

    // Click "Request Booking" on first teacher
    await page
      .getByRole("link", { name: /request booking/i })
      .first()
      .click();
    await page.waitForURL("**/bookings/new**", { timeout: 5_000 });

    await expect(page.getByRole("heading", { name: /request a booking/i })).toBeVisible();
    await expect(page.getByText("tara.smith@school.com")).toBeVisible();
    await expect(page.getByLabel(/start date/i)).toHaveValue("2026-06-16");

    await page.screenshot({ path: "e2e/screenshots/04-booking-form.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/04-booking-form.png");
  });
});
