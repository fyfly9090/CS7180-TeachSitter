/**
 * E2E — Auth pages (login + signup)
 *
 * Tests page rendering, form elements, navigation, and client-side validation.
 * Does NOT submit real credentials or create accounts.
 */

import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login page", () => {
  test("renders login form with all expected elements", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("TeachSitter").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText(/sign in to your account/i)).toBeVisible();

    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/auth-login-page.png", fullPage: true });
  });

  test("has link to signup page", async ({ page }) => {
    await page.goto("/login");

    const signupLink = page.getByRole("link", { name: /sign up/i });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute("href", "/signup");
  });

  test("shows password toggle button", async ({ page }) => {
    await page.goto("/login");

    const toggleBtn = page.getByRole("button", { name: /show password|hide password/i });
    await expect(toggleBtn).toBeVisible();
  });

  test("footer shows copyright and links", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText(/2026 TeachSitter/)).toBeVisible();
    await expect(page.getByRole("link", { name: /privacy/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /terms/i })).toBeVisible();
  });
});

test.describe("Signup page", () => {
  test("renders signup form with role selection", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByText("TeachSitter").first()).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: /childcare from teachers/i })
        .or(page.getByText(/create your account/i))
    ).toBeVisible();

    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();

    // Role selection buttons
    await expect(page.getByText(/parent/i).first()).toBeVisible();
    await expect(page.getByText(/teacher/i).first()).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/auth-signup-page.png", fullPage: true });
  });

  test("has link to login page", async ({ page }) => {
    await page.goto("/signup");

    const loginLink = page
      .getByRole("link", { name: /sign in/i })
      .or(page.getByRole("link", { name: /log in/i }));
    await expect(loginLink).toBeVisible();
  });
});

test.describe("Auth navigation", () => {
  test("login page signup link navigates to signup", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: /sign up/i }).click();
    await page.waitForURL("**/signup", { timeout: 5_000 });
    await expect(page).toHaveURL(/\/signup/);
  });

  test("signup page login link navigates to login", async ({ page }) => {
    await page.goto("/signup");

    const loginLink = page
      .getByRole("link", { name: /sign in/i })
      .or(page.getByRole("link", { name: /log in/i }));
    await loginLink.click();
    await page.waitForURL("**/login", { timeout: 5_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
