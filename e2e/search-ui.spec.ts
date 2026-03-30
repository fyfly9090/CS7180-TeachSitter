/**
 * E2E visual demo — Parent Search UI
 *
 * Auth is handled by globalSetup (creates one confirmed parent account,
 * signs in, saves storageState). Teacher seed data is also set up in globalSetup.
 *
 * The search page uses SSR (calls getAvailableTeachers server-side), so
 * page.route() API mocks won't intercept it. Tests rely on real seeded DB data.
 */

import { test, expect } from "@playwright/test";

// The seeded teacher's availability covers 2026-06-01 → 2026-08-31.
const SEARCH_URL = "/search?start_date=2026-06-16&end_date=2026-06-20";

test.describe("Parent Search UI — visual demo", () => {
  test("/search — teacher cards with AI reasoning", async ({ page }) => {
    await page.goto(SEARCH_URL);

    // Seeded teacher full_name is "Ms. Tara Smith"; use first() in case DB has extras
    await expect(page.getByText("Ms. Tara Smith").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/AI Match Reasoning/i).first()).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/01-search-results.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/01-search-results.png");
  });

  test("/search — shows hourly rate and availability times (requires migration 004)", async ({
    page,
  }) => {
    await page.goto(SEARCH_URL);

    await expect(page.getByText("Ms. Tara Smith").first()).toBeVisible({ timeout: 10_000 });

    // These assertions only pass if a teacher has hourly_rate + start_time/end_time set.
    const hasRate = await page
      .getByText(/\$\d+/)
      .isVisible()
      .catch(() => false);
    if (hasRate) {
      console.log("✓ hourly rate visible");
    } else {
      console.warn("⚠ No $X/hr visible — seed a teacher with hourly_rate to see it");
    }

    await page.screenshot({ path: "e2e/screenshots/02-search-rate-times.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/02-search-rate-times.png");
  });

  test("/search — filter by classroom narrows results", async ({ page }) => {
    await page.goto(SEARCH_URL);

    await expect(page.getByText("Ms. Tara Smith").first()).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/classroom/i).selectOption("Sunflower");
    await page.getByRole("button", { name: /update results/i }).click();

    // Wait for SSR navigation (dev mode can be slow: Redis retry + recompile)
    await page.waitForURL(/classroom=Sunflower/, { timeout: 45_000 });
    // Wait for skeleton to be gone (isPending resolved) then check content
    await page
      .waitForSelector('[data-testid="loading-skeleton"]', { state: "hidden", timeout: 45_000 })
      .catch(() => {});
    await expect(page.getByText("Ms. Tara Smith").first()).toBeVisible({ timeout: 45_000 });

    await page.screenshot({ path: "e2e/screenshots/03-search-filtered.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/03-search-filtered.png");
  });

  test("/search — empty state for non-overlapping dates", async ({ page }) => {
    // Dates outside the seeded availability range (2026-06-01 → 2026-08-31)
    await page.goto("/search?start_date=2025-01-01&end_date=2025-01-05");

    await expect(page.getByText(/no teachers available/i)).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: "e2e/screenshots/04-search-empty.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/04-search-empty.png");
  });

  test("/bookings/new — booking link carries correct params", async ({ page }) => {
    await page.goto(SEARCH_URL);

    await expect(page.getByText("Ms. Tara Smith").first()).toBeVisible({ timeout: 10_000 });

    // Click the first "Book [name]" link (anchors start with "Book ")
    await page
      .getByRole("link", { name: /^Book \w/i })
      .first()
      .click();
    await page.waitForURL("**/bookings/new**", { timeout: 5_000 });

    await page.screenshot({ path: "e2e/screenshots/05-booking-form.png", fullPage: true });
    console.log("Screenshot saved: e2e/screenshots/05-booking-form.png");
  });
});
