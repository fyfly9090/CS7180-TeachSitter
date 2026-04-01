/**
 * Seed bookings for a parent account to demo the /bookings UI.
 * Run: node scripts/seed-bookings.mjs
 *
 * Inserts 4 bookings for zixin.l@northeastern.edu:
 *   - 1 confirmed (future)  → appears in "Confirmed" section
 *   - 1 pending             → appears in "Pending Requests" section
 *   - 2 confirmed (past)    → appear in "Past Sessions" section
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

const PARENT_EMAIL = "zixin.l@northeastern.edu";

async function seed() {
  console.log(`Seeding bookings for ${PARENT_EMAIL}...\n`);

  // 1. Look up parent user ID
  const { data: listed } = await supabase.auth.admin.listUsers();
  const parentUser = listed?.users?.find((u) => u.email === PARENT_EMAIL);
  if (!parentUser) {
    console.error(`✗ User not found: ${PARENT_EMAIL}`);
    console.error("  Make sure the account exists (sign up at /signup first).");
    process.exit(1);
  }
  const parentId = parentUser.id;
  console.log(`✓ Parent user found: ${parentId}\n`);

  // 2. Look up teacher IDs by email
  const teacherEmails = [
    "tara.smith@school.com",
    "rachel.chen@school.com",
    "maya.jones@school.com",
  ];

  const teachers = {};
  for (const email of teacherEmails) {
    const u = listed?.users?.find((u) => u.email === email);
    if (!u) {
      console.warn(`  ⚠ Teacher not found: ${email} — run seed-remote.mjs first`);
      continue;
    }
    const { data: t } = await supabase
      .from("teachers")
      .select("id, full_name, classroom")
      .eq("user_id", u.id)
      .single();
    if (t) {
      teachers[email] = t;
      console.log(`✓ Teacher: ${t.full_name} (${t.classroom}) → ${t.id}`);
    }
  }

  const tara = teachers["tara.smith@school.com"];
  const rachel = teachers["rachel.chen@school.com"];
  const maya = teachers["maya.jones@school.com"];

  if (!tara || !rachel) {
    console.error("\n✗ Required teachers missing. Run `node scripts/seed-remote.mjs` first.");
    process.exit(1);
  }

  // 3. Insert bookings (idempotent: check by parent_id + teacher_id + start_date)
  const bookings = [
    {
      label: "Confirmed (future) — Ms. Tara Smith, Jun 16–20",
      row: {
        parent_id: parentId,
        teacher_id: tara.id,
        start_date: "2026-06-16",
        end_date: "2026-06-20",
        status: "confirmed",
        message: "Hi Tara! Lily is so excited to spend the week with you.",
      },
    },
    {
      label: "Pending — Ms. Rachel Chen, Jun 23–27",
      row: {
        parent_id: parentId,
        teacher_id: rachel.id,
        start_date: "2026-06-23",
        end_date: "2026-06-27",
        status: "pending",
        message: "Hello Ms. Chen, Oliver really enjoyed your class. Would love to book you!",
      },
    },
    {
      label: "Past (confirmed) — Ms. Tara Smith, Jan 6–10 2025",
      row: {
        parent_id: parentId,
        teacher_id: tara.id,
        start_date: "2025-01-06",
        end_date: "2025-01-10",
        status: "confirmed",
        message: null,
      },
    },
    {
      label: maya
        ? "Past (confirmed) — Ms. Maya Jones, Apr 14–18 2025"
        : "Past (confirmed) — Ms. Rachel Chen, Apr 14–18 2025",
      row: {
        parent_id: parentId,
        teacher_id: maya ? maya.id : rachel.id,
        start_date: "2025-04-14",
        end_date: "2025-04-18",
        status: "confirmed",
        message: null,
      },
    },
  ];

  console.log("\nInserting bookings...\n");

  for (const { label, row } of bookings) {
    // Check if booking already exists
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("parent_id", row.parent_id)
      .eq("teacher_id", row.teacher_id)
      .eq("start_date", row.start_date)
      .maybeSingle();

    if (existing) {
      console.log(`  ℹ already exists — ${label}`);
      continue;
    }

    const { error } = await supabase.from("bookings").insert(row);
    if (error) {
      console.error(`  ✗ failed — ${label}: ${error.message}`);
    } else {
      console.log(`  ✓ inserted — ${label}`);
    }
  }

  console.log("\nDone. Log in as", PARENT_EMAIL, "and visit /bookings to see the results.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
