/**
 * Seed remote Supabase with test teachers + availability.
 * Run: node scripts/seed-remote.mjs
 *
 * Idempotent — uses ON CONFLICT DO NOTHING via upsert.
 * Safe to run multiple times.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Seed data ─────────────────────────────────────────────────────────────────

const TEACHERS = [
  {
    email: "tara.smith@school.com",
    password: "TestPass123!",
    classroom: "Sunflower",
    bio: "5 years experience with preschoolers. Loves art, music, and outdoor play.",
    availability: [
      { start_date: "2026-06-15", end_date: "2026-06-30" },
      { start_date: "2026-07-14", end_date: "2026-07-25" },
    ],
  },
  {
    email: "rachel.chen@school.com",
    password: "TestPass123!",
    classroom: "Butterfly",
    bio: "Certified early childhood educator with a passion for STEM activities.",
    availability: [{ start_date: "2026-06-15", end_date: "2026-07-04" }],
  },
  {
    email: "maya.jones@school.com",
    password: "TestPass123!",
    classroom: "Rainbow",
    bio: "7 years experience. Storytelling, outdoor adventures, and social skills.",
    availability: [{ start_date: "2026-06-15", end_date: "2026-08-15" }],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding remote Supabase...\n");

  for (const teacher of TEACHERS) {
    console.log(`→ ${teacher.email}`);

    // 1. Create auth user (or get existing)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: teacher.email,
      password: teacher.password,
      email_confirm: true,
      user_metadata: { role: "teacher" },
    });

    let userId;
    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        // User exists — look up their ID
        const { data: listed } = await supabase.auth.admin.listUsers();
        const existing = listed?.users?.find((u) => u.email === teacher.email);
        if (!existing) {
          console.error(`  ✗ Could not find existing user: ${createErr.message}`);
          continue;
        }
        userId = existing.id;
        console.log(`  ℹ user already exists (${userId})`);
      } else {
        console.error(`  ✗ create user failed: ${createErr.message}`);
        continue;
      }
    } else {
      userId = created.user.id;
      console.log(`  ✓ created auth user (${userId})`);
    }

    // 2. Ensure profiles row exists (trigger may have run already)
    await supabase
      .from("profiles")
      .upsert({ id: userId, email: teacher.email, role: "teacher" }, { onConflict: "id" });

    // 3. Upsert teacher row
    const { data: teacherRow, error: tErr } = await supabase
      .from("teachers")
      .upsert(
        { user_id: userId, classroom: teacher.classroom, bio: teacher.bio },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (tErr) {
      console.error(`  ✗ teacher upsert failed: ${tErr.message}`);
      continue;
    }
    const teacherId = teacherRow.id;
    console.log(`  ✓ teacher record (${teacherId})`);

    // 4. Insert availability (skip if teacher already has slots)
    const { count } = await supabase
      .from("availability")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId);

    if (count && count > 0) {
      console.log(`  ℹ availability already exists (${count} slots)`);
    } else {
      const slots = teacher.availability.map((a) => ({
        teacher_id: teacherId,
        start_date: a.start_date,
        end_date: a.end_date,
        is_booked: false,
      }));
      const { error: aErr } = await supabase.from("availability").insert(slots);
      if (aErr) {
        console.error(`  ✗ availability insert failed: ${aErr.message}`);
      } else {
        console.log(`  ✓ ${slots.length} availability slot(s) inserted`);
      }
    }

    console.log();
  }

  console.log("Done. Visit /search to see teacher cards.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
