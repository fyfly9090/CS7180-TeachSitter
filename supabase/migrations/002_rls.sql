-- Migration: 002_rls.sql
-- Enables Row Level Security on all tables and defines per-table policies.
-- Helper functions encapsulate common auth checks to avoid repeated subqueries.

-- =====================
-- ENABLE RLS ON ALL TABLES
-- =====================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_evals  ENABLE ROW LEVEL SECURITY;

-- =====================
-- HELPER FUNCTIONS
-- STABLE + SECURITY DEFINER: PostgreSQL caches result per query,
-- and the function runs as its definer (bypassing RLS on profiles/teachers).
-- =====================

-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns the teachers.id for the currently authenticated teacher user
CREATE OR REPLACE FUNCTION public.get_teacher_id()
RETURNS uuid AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================
-- PROFILES POLICIES
-- Users can only read and update their own profile row.
-- INSERT is handled exclusively by the handle_new_user() trigger (SECURITY DEFINER).
-- =====================

CREATE POLICY "profiles: owner select"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================
-- TEACHERS POLICIES
-- Any authenticated user can read teacher profiles (parents need this for search).
-- Only the teacher who owns the record can write it.
-- =====================

CREATE POLICY "teachers: authenticated select"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teachers: owner insert"
  ON public.teachers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND get_user_role() = 'teacher');

CREATE POLICY "teachers: owner update"
  ON public.teachers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND get_user_role() = 'teacher');

CREATE POLICY "teachers: owner delete"
  ON public.teachers FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND get_user_role() = 'teacher');

-- =====================
-- AVAILABILITY POLICIES
-- Parents (and all authenticated users) see unbooked slots only.
-- Teachers additionally see all their own slots (including booked ones).
-- Only the owning teacher can insert/update/delete their slots.
-- =====================

-- Authenticated users see unbooked slots (for parent search)
CREATE POLICY "availability: authenticated select unbooked"
  ON public.availability FOR SELECT
  TO authenticated
  USING (is_booked = false);

-- Teachers see all their own slots regardless of is_booked
CREATE POLICY "availability: owner select all"
  ON public.availability FOR SELECT
  TO authenticated
  USING (teacher_id = get_teacher_id());

CREATE POLICY "availability: owner insert"
  ON public.availability FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = get_teacher_id() AND get_user_role() = 'teacher');

CREATE POLICY "availability: owner update"
  ON public.availability FOR UPDATE
  TO authenticated
  USING (teacher_id = get_teacher_id())
  WITH CHECK (teacher_id = get_teacher_id());

CREATE POLICY "availability: owner delete"
  ON public.availability FOR DELETE
  TO authenticated
  USING (teacher_id = get_teacher_id());

-- =====================
-- CHILDREN POLICIES
-- Parents can only access their own children records.
-- =====================

CREATE POLICY "children: owner select"
  ON public.children FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "children: owner insert"
  ON public.children FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid() AND get_user_role() = 'parent');

CREATE POLICY "children: owner update"
  ON public.children FOR UPDATE
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "children: owner delete"
  ON public.children FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid());

-- =====================
-- BOOKINGS POLICIES
-- Parents: read/create own bookings.
-- Teachers: read + update status on bookings directed at them.
-- No delete — booking history is preserved (RESTRICT FK).
-- =====================

CREATE POLICY "bookings: parent select"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid() AND get_user_role() = 'parent');

CREATE POLICY "bookings: teacher select"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (teacher_id = get_teacher_id() AND get_user_role() = 'teacher');

CREATE POLICY "bookings: parent insert"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid() AND get_user_role() = 'parent');

-- Teachers can only update status (confirmed/declined) — no other field changes.
-- Application logic in PATCH /api/bookings/[id] enforces status-only updates.
CREATE POLICY "bookings: teacher update status"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (teacher_id = get_teacher_id() AND get_user_role() = 'teacher')
  WITH CHECK (teacher_id = get_teacher_id());

-- =====================
-- MATCH_EVALS POLICIES
-- No authenticated-user access at the RLS level.
-- All writes come from the server via the service role key (bypasses RLS).
-- All reads in /api/evals also use the service role key.
-- This explicit deny prevents any accidental client-side exposure.
-- =====================

CREATE POLICY "match_evals: deny authenticated"
  ON public.match_evals FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
