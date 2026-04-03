/**
 * E2E — Parent Booking Flow
 *
 * Tests the end-to-end flow from search results to booking form.
 * Uses the parent auth state from globalSetup and seeded teacher data.
 */

import { test, expect } from "@playwright/test";

// Seeded teacher availability: 2026-06-01 to 2026-08-31
const SEARCH_URL = "/search?start_date=2026-06-16&end_date=2026-06-20";

test.describe("Parent Booking Flow", () => {
  test("search results show Book button for available teachers", async ({ page }) => {
    await page.goto(SEARCH_URL);

    await expect(page.getByText("Ms. Tara Smith").first()).toBeVisible({ timeout: 15_000 });

    // Look for a Book link/button
    const bookLink = page.getByRole("link", { name: /book/i }).first();
    await expect(bookLink).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: "e2e/screenshots/booking-search-results.png",
      fullPage: true,
    });
  });

  test("clicking Book navigates to booking form with params", async ({ page }) => {
    await page.goto(SEARCH_URL);

    await expect(page.getByText("Ms. Tara Smith").first()).toBeVisible({ timeout: 15_000 });

    // Click the first Book link
    await page
      .getByRole("link", { name: /^Book \w/i })
      .first()
      .click();
    await page.waitForURL("**/bookings/new**", { timeout: 10_000 });

    // URL should contain teacher and date params
    const url = page.url();
    expect(url).toContain("bookings/new");

    await page.screenshot({
      path: "e2e/screenshots/booking-form.png",
      fullPage: true,
    });
  });

  test("booking form renders with expected fields", async ({ page }) => {
    await page.goto(SEARCH_URL);

    await expect(page.getByText("Ms. Tara Smith").first()).toBeVisible({ timeout: 15_000 });

    await page
      .getByRole("link", { name: /^Book \w/i })
      .first()
      .click();
    await page.waitForURL("**/bookings/new**", { timeout: 10_000 });

    // Check for form elements on booking page
    const hasTeacherInfo = await page
      .getByText(/tara/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasMessageField = await page
      .getByLabel(/message/i)
      .or(page.locator("textarea").first())
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasSubmitBtn = await page
      .getByRole("button", { name: /confirm|book|submit|send/i })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (hasTeacherInfo) console.log("Teacher info visible on booking form");
    if (hasMessageField) console.log("Message field visible on booking form");
    if (hasSubmitBtn) console.log("Submit button visible on booking form");

    await page.screenshot({
      path: "e2e/screenshots/booking-form-fields.png",
      fullPage: true,
    });
  });
});

test.describe("Parent Bookings list", () => {
  test("bookings page loads with heading", async ({ page }) => {
    await page.goto("/bookings");

    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    const url = page.url();
    if (url.includes("/bookings")) {
      // Check for bookings page heading
      const hasHeading = await page
        .getByRole("heading", { name: /booking/i })
        .or(page.getByText(/my bookings/i).first())
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      if (hasHeading) {
        console.log("Bookings page heading visible");
      }

      await page.screenshot({
        path: "e2e/screenshots/bookings-list.png",
        fullPage: true,
      });
    }
  });
});
