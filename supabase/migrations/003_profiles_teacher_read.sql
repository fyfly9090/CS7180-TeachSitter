-- Migration: 003_profiles_teacher_read.sql
-- Allow any authenticated user to read profiles of teacher accounts.
-- Required so parents can see teacher names (emails) in search results
-- without the profiles!inner join being blocked by the owner-only SELECT policy.

CREATE POLICY "profiles: authenticated read teachers"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (role = 'teacher');
