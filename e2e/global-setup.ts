/**
 * Playwright global setup — runs once before all tests.
 *
 * 1. Creates a confirmed test parent user via Supabase Admin API.
 * 2. Creates a confirmed test teacher user + seeds teacher profile + availability.
 * 3. Signs in as parent via the login page to capture real SSR session cookies.
 * 4. Saves storageState to e2e/auth-state.json for test reuse.
 */

import { chromium } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = "http://localhost:3000";

export const TEST_EMAIL = "e2e-parent@teachsitter-test.dev";
export const TEST_PASSWORD = "E2eTestPass123!";

const TEACHER_EMAIL = "e2e-teacher@teachsitter-test.dev";
const TEACHER_PASSWORD = "E2eTestPass123!";

// ── Supabase REST helpers ────────────────────────────────────────────────────

async function adminPost(
  path: string,
  body: object
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function restPost(
  table: string,
  body: object,
  upsert = false,
  onConflict?: string
): Promise<{ ok: boolean; data: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    Prefer: upsert ? "resolution=merge-duplicates,return=representation" : "return=representation",
  };
  const url =
    upsert && onConflict
      ? `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`
      : `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function restGet(table: string, query: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  return (await res.json()) as unknown[];
}

// ── Setup ────────────────────────────────────────────────────────────────────

export default async function globalSetup() {
  // ── 1. Create parent user ────────────────────────────────────────────────
  const parentRes = await adminPost("/auth/v1/admin/users", {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { role: "parent" },
  });
  if (!parentRes.ok && parentRes.status !== 422) {
    throw new Error(`Failed to create parent user: ${JSON.stringify(parentRes.data)}`);
  }

  // ── 2. Create teacher user + seed profile + teacher + availability ────────
  const teacherRes = await adminPost("/auth/v1/admin/users", {
    email: TEACHER_EMAIL,
    password: TEACHER_PASSWORD,
    email_confirm: true,
    user_metadata: { role: "teacher" },
  });
  if (!teacherRes.ok && teacherRes.status !== 422) {
    throw new Error(`Failed to create teacher user: ${JSON.stringify(teacherRes.data)}`);
  }

  // Resolve teacher's profile id (profile row is created by DB trigger on signup)
  const profiles = await restGet(
    "profiles",
    `email=eq.${encodeURIComponent(TEACHER_EMAIL)}&select=id`
  );
  const teacherProfileId = (profiles[0] as { id: string } | undefined)?.id;
  if (!teacherProfileId) throw new Error("Teacher profile not found after user creation");

  // Upsert teacher row — try with hourly_rate first (migration 004), fall back without.
  let teacherRow = await restPost(
    "teachers",
    {
      user_id: teacherProfileId,
      classroom: "Sunflower",
      bio: "5 years teaching preschool. Loves art, music, and outdoor play.",
      hourly_rate: 45,
      full_name: "Ms. Tara Smith",
      position: "Preschool Teacher",
    },
    true,
    "user_id"
  );
  if (!teacherRow.ok) {
    // Migrations 004/005 not yet applied — upsert without the new columns
    console.warn(
      "[global-setup] new columns not found, seeding without them (run migrations 004 + 005)"
    );
    teacherRow = await restPost(
      "teachers",
      {
        user_id: teacherProfileId,
        classroom: "Sunflower",
        bio: "5 years teaching preschool. Loves art, music, and outdoor play.",
      },
      true,
      "user_id"
    );
    if (!teacherRow.ok)
      throw new Error(`Failed to upsert teacher: ${JSON.stringify(teacherRow.data)}`);
  }

  const teacherRows = await restGet("teachers", `user_id=eq.${teacherProfileId}&select=id`);
  const teacherId = (teacherRows[0] as { id: string } | undefined)?.id;
  if (!teacherId) throw new Error("Teacher row not found after upsert");

  // Delete existing test availability rows so we can re-insert cleanly (no unique constraint to upsert on).
  await fetch(`${SUPABASE_URL}/rest/v1/availability?teacher_id=eq.${teacherId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });

  // Insert availability — try with start_time/end_time first (migration 004), fall back without.
  let avail = await restPost("availability", {
    teacher_id: teacherId,
    start_date: "2026-06-01",
    end_date: "2026-08-31",
    start_time: "16:00:00",
    end_time: "20:00:00",
    is_booked: false,
  });
  if (!avail.ok) {
    console.warn(
      "[global-setup] start_time/end_time columns not found, seeding without them (run migration 004)"
    );
    avail = await restPost("availability", {
      teacher_id: teacherId,
      start_date: "2026-06-01",
      end_date: "2026-08-31",
      is_booked: false,
    });
    if (!avail.ok) throw new Error(`Failed to insert availability: ${JSON.stringify(avail.data)}`);
  }

  // ── 3. Sign in as parent via login UI ────────────────────────────────────
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email address/i).fill(TEST_EMAIL);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/(dashboard|search|teacher|bookings)/, { timeout: 15_000 });

  // ── 4. Save session cookies ───────────────────────────────────────────────
  await context.storageState({ path: "e2e/auth-state.json" });

  await browser.close();
}
