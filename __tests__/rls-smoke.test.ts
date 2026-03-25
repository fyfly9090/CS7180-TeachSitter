// @vitest-environment node
// RLS smoke tests — integration tests that hit the real Supabase DB.
// Skipped automatically when SUPABASE_SERVICE_ROLE_KEY is absent (unit test CI).
// Run manually with all three env vars set to verify RLS policy enforcement.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   npm run test -- __tests__/rls-smoke.test.ts

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import type { Database } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const canRun = !!SUPABASE_URL && !!ANON_KEY && !!SERVICE_KEY;

// Service role client — bypasses RLS, used for setup/teardown only.
// Lazily constructed so module-level init doesn't crash when env vars are absent.
const admin = canRun
  ? createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : (null as unknown as ReturnType<typeof createClient<Database>>);

async function signInAs(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInAs(${email}) failed: ${error.message}`);
  return client;
}

describe.skipIf(!canRun)("RLS smoke tests", () => {
  const TEST_PASSWORD = "rls-test-pw-123!";
  const ts = Date.now();

  const parentAEmail = `rls-parent-a-${ts}@test.invalid`;
  const parentBEmail = `rls-parent-b-${ts}@test.invalid`;
  const teacherAEmail = `rls-teacher-a-${ts}@test.invalid`;
  const teacherBEmail = `rls-teacher-b-${ts}@test.invalid`;

  let parentAId: string;
  let parentBId: string;
  let teacherAId: string;
  let teacherBId: string;
  let teacherAProfileId: string;
  let teacherBProfileId: string;
  let childAId: string;
  let bookingAId: string;

  beforeAll(async () => {
    // Create ephemeral test users via admin API
    const { data: pA, error: pAErr } = await admin.auth.admin.createUser({
      email: parentAEmail,
      password: TEST_PASSWORD,
      user_metadata: { role: "parent" },
      email_confirm: true,
    });
    if (pAErr) throw pAErr;
    parentAId = pA.user.id;

    const { data: pB, error: pBErr } = await admin.auth.admin.createUser({
      email: parentBEmail,
      password: TEST_PASSWORD,
      user_metadata: { role: "parent" },
      email_confirm: true,
    });
    if (pBErr) throw pBErr;
    parentBId = pB.user.id;

    const { data: tA, error: tAErr } = await admin.auth.admin.createUser({
      email: teacherAEmail,
      password: TEST_PASSWORD,
      user_metadata: { role: "teacher" },
      email_confirm: true,
    });
    if (tAErr) throw tAErr;
    teacherAId = tA.user.id;

    const { data: tB, error: tBErr } = await admin.auth.admin.createUser({
      email: teacherBEmail,
      password: TEST_PASSWORD,
      user_metadata: { role: "teacher" },
      email_confirm: true,
    });
    if (tBErr) throw tBErr;
    teacherBId = tB.user.id;

    // Ensure profiles exist (trigger fires on auth.users insert, but belt+suspenders)
    await admin.from("profiles").upsert(
      [
        { id: parentAId, email: parentAEmail, role: "parent" },
        { id: parentBId, email: parentBEmail, role: "parent" },
        { id: teacherAId, email: teacherAEmail, role: "teacher" },
        { id: teacherBId, email: teacherBEmail, role: "teacher" },
      ],
      { onConflict: "id", ignoreDuplicates: true }
    );

    // Insert teacher profiles via service role (bypasses RLS)
    const { data: tAProfile, error: tAProfileErr } = await admin
      .from("teachers")
      .insert({ user_id: teacherAId, classroom: "Sunflower", bio: "Teacher A bio" })
      .select("id")
      .single();
    if (tAProfileErr) throw tAProfileErr;
    teacherAProfileId = tAProfile.id;

    const { data: tBProfile, error: tBProfileErr } = await admin
      .from("teachers")
      .insert({ user_id: teacherBId, classroom: "Rose", bio: "Teacher B bio" })
      .select("id")
      .single();
    if (tBProfileErr) throw tBProfileErr;
    teacherBProfileId = tBProfile.id;

    // Insert availability for teacher A: one unbooked + one booked slot
    await admin.from("availability").insert([
      {
        teacher_id: teacherAProfileId,
        start_date: "2026-06-16",
        end_date: "2026-06-20",
        is_booked: false,
      },
      {
        teacher_id: teacherAProfileId,
        start_date: "2026-07-01",
        end_date: "2026-07-05",
        is_booked: true,
      },
    ]);

    // Insert child for parent A
    const { data: child, error: childErr } = await admin
      .from("children")
      .insert({ parent_id: parentAId, classroom: "Sunflower", age: 4 })
      .select("id")
      .single();
    if (childErr) throw childErr;
    childAId = child.id;

    // Insert a separate child for parent B
    await admin.from("children").insert({ parent_id: parentBId, classroom: "Rose", age: 3 });

    // Insert booking: parent A → teacher A
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .insert({
        parent_id: parentAId,
        teacher_id: teacherAProfileId,
        start_date: "2026-06-16",
        end_date: "2026-06-20",
        status: "pending",
      })
      .select("id")
      .single();
    if (bookingErr) throw bookingErr;
    bookingAId = booking.id;
  }, 30000);

  afterAll(async () => {
    // Clean up in reverse dependency order via service role
    await admin.from("bookings").delete().in("parent_id", [parentAId, parentBId]);
    await admin.from("children").delete().in("parent_id", [parentAId, parentBId]);
    await admin
      .from("availability")
      .delete()
      .in("teacher_id", [teacherAProfileId, teacherBProfileId]);
    await admin.from("teachers").delete().in("user_id", [teacherAId, teacherBId]);
    await admin.auth.admin.deleteUser(parentAId);
    await admin.auth.admin.deleteUser(parentBId);
    await admin.auth.admin.deleteUser(teacherAId);
    await admin.auth.admin.deleteUser(teacherBId);
  }, 30000);

  // ============================================================
  // CHILDREN: parent can only read/write their own rows
  // ============================================================
  describe("children: parent isolation", () => {
    test("parent sees only their own children", async () => {
      const client = await signInAs(parentAEmail, TEST_PASSWORD);
      const { data, error } = await client.from("children").select("*");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(childAId);
    });

    test("parent cannot see another parent's children", async () => {
      const client = await signInAs(parentBEmail, TEST_PASSWORD);
      const { data, error } = await client.from("children").select("*").eq("id", childAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0); // RLS filters out parent A's child
    });
  });

  // ============================================================
  // BOOKINGS: parent/teacher isolation
  // ============================================================
  describe("bookings: parent/teacher isolation", () => {
    test("parent sees only their own bookings", async () => {
      const client = await signInAs(parentAEmail, TEST_PASSWORD);
      const { data, error } = await client.from("bookings").select("*");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(bookingAId);
    });

    test("teacher sees only bookings directed at them", async () => {
      const client = await signInAs(teacherAEmail, TEST_PASSWORD);
      const { data, error } = await client.from("bookings").select("*");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(bookingAId);
    });

    test("teacher cannot update a booking directed at another teacher", async () => {
      const client = await signInAs(teacherBEmail, TEST_PASSWORD);
      // Teacher B tries to confirm booking A (which belongs to teacher A)
      await client.from("bookings").update({ status: "confirmed" }).eq("id", bookingAId);
      // Verify via service role that status is unchanged
      const { data } = await admin.from("bookings").select("status").eq("id", bookingAId).single();
      expect(data!.status).toBe("pending");
    });
  });

  // ============================================================
  // TEACHERS: any authenticated user can read; only owner can write
  // ============================================================
  describe("teachers: authenticated read / owner write", () => {
    test("any authenticated user can read all teacher profiles", async () => {
      const client = await signInAs(parentAEmail, TEST_PASSWORD);
      const { data, error } = await client.from("teachers").select("id");
      expect(error).toBeNull();
      // At least teacher A and B created in this test run
      expect(data!.length).toBeGreaterThanOrEqual(2);
    });

    test("teacher cannot update another teacher's profile", async () => {
      const client = await signInAs(teacherBEmail, TEST_PASSWORD);
      await client.from("teachers").update({ bio: "hacked" }).eq("id", teacherAProfileId);
      // Verify via service role that bio is unchanged
      const { data } = await admin
        .from("teachers")
        .select("bio")
        .eq("id", teacherAProfileId)
        .single();
      expect(data!.bio).toBe("Teacher A bio");
    });
  });

  // ============================================================
  // AVAILABILITY: authenticated sees unbooked only; teacher sees all own
  // ============================================================
  describe("availability: teacher isolation", () => {
    test("authenticated user sees only unbooked slots", async () => {
      const client = await signInAs(parentAEmail, TEST_PASSWORD);
      const { data, error } = await client
        .from("availability")
        .select("*")
        .eq("teacher_id", teacherAProfileId);
      expect(error).toBeNull();
      expect(data!.every((row) => row.is_booked === false)).toBe(true);
    });

    test("teacher sees all own slots including booked ones", async () => {
      const client = await signInAs(teacherAEmail, TEST_PASSWORD);
      const { data, error } = await client
        .from("availability")
        .select("*")
        .eq("teacher_id", teacherAProfileId);
      expect(error).toBeNull();
      expect(data!.some((row) => row.is_booked === true)).toBe(true);
      expect(data!.some((row) => row.is_booked === false)).toBe(true);
    });
  });

  // ============================================================
  // MATCH_EVALS: deny all authenticated users (service role only)
  // ============================================================
  describe("match_evals: deny all authenticated", () => {
    test("authenticated user cannot read match_evals", async () => {
      const client = await signInAs(parentAEmail, TEST_PASSWORD);
      const { data, error } = await client.from("match_evals").select("*");
      // RLS USING (false) returns empty result set, not an error
      expect(data).toHaveLength(0);
    });

    test("authenticated user cannot insert into match_evals", async () => {
      const client = await signInAs(parentAEmail, TEST_PASSWORD);
      const { error } = await client.from("match_evals").insert({
        parent_id: parentAId,
        ranked_teachers: [],
      });
      expect(error).not.toBeNull(); // RLS WITH CHECK (false) blocks insert
    });
  });
});
