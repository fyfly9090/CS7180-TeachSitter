-- seed.sql — Local development seed data
-- Run via:  npm run db:seed  (requires local Supabase running: npx supabase start)
-- Full reset: npx supabase db reset  (drops DB, re-applies migrations, then seeds)
--
-- Credentials for all seed users: password123
-- Fixed UUIDs allow idempotent re-seeding with ON CONFLICT DO NOTHING.

-- =====================
-- AUTH USERS
-- Inserting directly into auth.users is the standard local-dev seed pattern.
-- The handle_new_user() trigger auto-creates a matching public.profiles row.
-- =====================

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  -- Parent 1
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'parent1@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"parent"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  -- Parent 2
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'parent2@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"parent"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  -- Teacher 1
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'teacher1@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"teacher"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  -- Teacher 2
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'teacher2@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"teacher"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  -- Teacher 3
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'teacher3@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"teacher"}'::jsonb,
    now(), now(), '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- =====================
-- PROFILES
-- The handle_new_user() trigger creates these on auth.users INSERT.
-- Explicit insert here ensures idempotent re-seeding without a full db reset.
-- =====================

INSERT INTO public.profiles (id, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'parent1@test.com',  'parent'),
  ('00000000-0000-0000-0000-000000000002', 'parent2@test.com',  'parent'),
  ('00000000-0000-0000-0000-000000000003', 'teacher1@test.com', 'teacher'),
  ('00000000-0000-0000-0000-000000000004', 'teacher2@test.com', 'teacher'),
  ('00000000-0000-0000-0000-000000000005', 'teacher3@test.com', 'teacher')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- TEACHER PROFILES
-- =====================

INSERT INTO public.teachers (id, user_id, classroom, bio) VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000003',
    'Sunflower',
    '5 years experience with preschoolers. Loves art, music, and outdoor play.'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000004',
    'Rose',
    '3 years experience. STEM activities and hands-on science specialist.'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000005',
    'Daisy',
    '7 years experience. Storytelling, outdoor adventures, and social skills.'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================
-- AVAILABILITY (summer break 2026)
-- =====================

INSERT INTO public.availability (id, teacher_id, start_date, end_date, is_booked) VALUES
  -- Teacher 1 (Sunflower) — two windows
  (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    '2026-06-15', '2026-06-30', false
  ),
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000010',
    '2026-07-14', '2026-07-25', false
  ),
  -- Teacher 2 (Rose) — two windows
  (
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000011',
    '2026-06-15', '2026-07-04', false
  ),
  (
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000011',
    '2026-07-21', '2026-08-01', false
  ),
  -- Teacher 3 (Daisy) — full summer
  (
    '00000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000012',
    '2026-06-15', '2026-08-15', false
  )
ON CONFLICT (id) DO NOTHING;

-- =====================
-- CHILDREN
-- =====================

INSERT INTO public.children (id, parent_id, classroom, age) VALUES
  -- Parent 1's child — Sunflower class (matches teacher 1)
  (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000001',
    'Sunflower', 4
  ),
  -- Parent 2's child — Rose class (matches teacher 2)
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000002',
    'Rose', 3
  )
ON CONFLICT (id) DO NOTHING;

-- =====================
-- BOOKINGS
-- =====================

INSERT INTO public.bookings (id, parent_id, teacher_id, start_date, end_date, status, message) VALUES
  -- Parent 1 → Teacher 1 (Sunflower match), pending
  (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    '2026-06-16', '2026-06-20',
    'pending',
    'Hi! My daughter Lily loves your Sunflower class, hoping you can watch her!'
  ),
  -- Parent 2 → Teacher 2 (Rose match), confirmed
  (
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000011',
    '2026-06-16', '2026-06-20',
    'confirmed',
    'Hi! My son loves STEM activities. Looking forward to it!'
  )
ON CONFLICT (id) DO NOTHING;
