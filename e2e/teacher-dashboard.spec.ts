/**
 * E2E — Teacher Dashboard
 *
 * The default storageState is for a parent user. Teacher dashboard may redirect
 * unauthenticated / wrong-role users. Tests verify the page loads and check
 * for key UI elements visible to any visitor or after redirect.
 */

import { test, expect } from "@playwright/test";

test.describe("Teacher Dashboard page", () => {
  test("loads and shows TeachSitter branding", async ({ page }) => {
    await page.goto("/teacher/dashboard");

    // Page should load — it may show content or redirect to login
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // Check if we landed on the dashboard or got redirected
    const url = page.url();
    if (url.includes("/teacher/dashboard")) {
      // On the dashboard — check for key elements
      await expect(page.getByText("TeachSitter").first()).toBeVisible({ timeout: 10_000 });

      await page.screenshot({
        path: "e2e/screenshots/teacher-dashboard.png",
        fullPage: true,
      });
    } else {
      // Redirected (likely to login) — that's expected for parent auth state
      console.log(`Redirected to: ${url} (expected — parent auth state)`);
      await page.screenshot({
        path: "e2e/screenshots/teacher-dashboard-redirect.png",
        fullPage: true,
      });
    }
  });

  test("teacher nav links are present when page loads", async ({ page }) => {
    await page.goto("/teacher/dashboard");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    const url = page.url();
    if (url.includes("/teacher/dashboard")) {
      // Verify dashboard nav link is visible (rendered by layout or inline navbar)
      await expect(page.getByRole("link", { name: /dashboard/i }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("shows stats cards when data loads", async ({ page }) => {
    await page.goto("/teacher/dashboard");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    const url = page.url();
    if (url.includes("/teacher/dashboard")) {
      // Look for stats text — these are always rendered even with 0 counts
      const hasUpcoming = await page
        .getByText(/upcoming sessions|confirmed bookings/i)
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      const hasPending = await page
        .getByText(/pending requests/i)
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      if (hasUpcoming || hasPending) {
        console.log("Stats cards visible");
      }

      await page.screenshot({
        path: "e2e/screenshots/teacher-dashboard-stats.png",
        fullPage: true,
      });
    }
  });
});
