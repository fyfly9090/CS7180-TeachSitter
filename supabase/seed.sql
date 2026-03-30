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
  ),
  -- Teacher 4
  (
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'teacher4@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"teacher"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  -- Teacher 5
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'teacher5@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"teacher"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  -- Teacher 6
  (
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'teacher6@test.com',
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
  ('00000000-0000-0000-0000-000000000005', 'teacher3@test.com', 'teacher'),
  ('00000000-0000-0000-0000-000000000006', 'teacher4@test.com', 'teacher'),
  ('00000000-0000-0000-0000-000000000007', 'teacher5@test.com', 'teacher'),
  ('00000000-0000-0000-0000-000000000008', 'teacher6@test.com', 'teacher')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- TEACHER PROFILES
-- =====================

INSERT INTO public.teachers (id, user_id, classroom, bio, full_name, position, hourly_rate) VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000003',
    'Sunflower',
    '5 years experience with preschoolers. Loves art, music, and outdoor play.',
    'Ms. Sarah Johnson',
    'Preschool Teacher',
    18.00
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000004',
    'Rose',
    '3 years experience. STEM activities and hands-on science specialist.',
    'Ms. Rachel Chen',
    'Preschool Teacher',
    16.00
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000005',
    'Daisy',
    '7 years experience. Storytelling, outdoor adventures, and social skills.',
    'Ms. Maya Jones',
    'Lead Preschool Teacher',
    20.00
  ),
  -- Teacher 4
  (
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000006',
    'Tulip',
    '4 years experience. Bilingual (English/Spanish), creative arts and movement specialist.',
    'Ms. Sofia Rivera',
    'Preschool Teacher',
    17.00
  ),
  -- Teacher 5
  (
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000007',
    'Sunflower',
    '6 years experience. Specializes in sensory play and early literacy development.',
    'Ms. Emily Park',
    'Senior Preschool Teacher',
    19.00
  ),
  -- Teacher 6
  (
    '00000000-0000-0000-0000-000000000015',
    '00000000-0000-0000-0000-000000000008',
    'Rose',
    '2 years experience. Energetic and caring; focuses on social-emotional learning.',
    'Mr. James Liu',
    'Preschool Teacher',
    15.00
  )
ON CONFLICT (id) DO NOTHING;

-- =====================
-- AVAILABILITY (summer break 2026)
-- =====================

INSERT INTO public.availability (id, teacher_id, start_date, end_date, is_booked, start_time, end_time) VALUES
  -- Teacher 1 (Sunflower) — two windows
  (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    '2026-06-15', '2026-06-30', false, '08:00', '17:00'
  ),
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000010',
    '2026-07-14', '2026-07-25', false, '08:00', '17:00'
  ),
  -- Teacher 2 (Rose) — two windows
  (
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000011',
    '2026-06-15', '2026-07-04', false, '09:00', '18:00'
  ),
  (
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000011',
    '2026-07-21', '2026-08-01', false, '09:00', '18:00'
  ),
  -- Teacher 3 (Daisy) — full summer
  (
    '00000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000012',
    '2026-06-15', '2026-08-15', false, '07:30', '16:30'
  ),
  -- Teacher 4 (Tulip) — two windows
  (
    '00000000-0000-0000-0000-000000000025',
    '00000000-0000-0000-0000-000000000013',
    '2026-06-15', '2026-07-10', false, '08:30', '17:30'
  ),
  (
    '00000000-0000-0000-0000-000000000026',
    '00000000-0000-0000-0000-000000000013',
    '2026-07-28', '2026-08-14', false, '08:30', '17:30'
  ),
  -- Teacher 5 (Sunflower) — one window
  (
    '00000000-0000-0000-0000-000000000027',
    '00000000-0000-0000-0000-000000000014',
    '2026-06-22', '2026-08-07', false, '08:00', '16:00'
  ),
  -- Teacher 6 (Rose) — two windows
  (
    '00000000-0000-0000-0000-000000000028',
    '00000000-0000-0000-0000-000000000015',
    '2026-06-15', '2026-06-26', false, '09:00', '17:00'
  ),
  (
    '00000000-0000-0000-0000-000000000029',
    '00000000-0000-0000-0000-000000000015',
    '2026-07-06', '2026-08-15', false, '09:00', '17:00'
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
