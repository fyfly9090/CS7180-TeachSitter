-- Migration: 001_init.sql
-- Creates enums, all 6 application tables, trigger, and indexes

-- =====================
-- ENUMS
-- =====================

CREATE TYPE user_role AS ENUM ('parent', 'teacher');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'declined');

-- =====================
-- PROFILES
-- Extends auth.users with app-level role.
-- Supabase owns auth.users; this table lives in public schema
-- and is kept in sync via the trigger below.
-- =====================

CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL UNIQUE,
  role       user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-insert a profiles row whenever a new auth.users row is created.
-- The signup API passes role via raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'role')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- TEACHERS
-- One row per teacher user. user_id is UNIQUE — one teacher profile per account.
-- =====================

CREATE TABLE public.teachers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  classroom  text NOT NULL,
  bio        text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- AVAILABILITY
-- Date ranges posted by teachers. is_booked flips to true when
-- a booking is confirmed for that slot.
-- =====================

CREATE TABLE public.availability (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date   date NOT NULL,
  is_booked  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_dates_valid CHECK (end_date >= start_date)
);

-- =====================
-- CHILDREN
-- Parent's children — used to match classroom familiarity in AI ranking.
-- age constraint: preschool range 1–10.
-- =====================

CREATE TABLE public.children (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classroom  text NOT NULL,
  age        integer NOT NULL CHECK (age >= 1 AND age <= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- BOOKINGS
-- Links parent → teacher for a specific date range.
-- ON DELETE RESTRICT on both FKs: booking history must not be
-- silently removed if a user account is deleted.
-- =====================

CREATE TABLE public.bookings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date   date NOT NULL,
  status     booking_status NOT NULL DEFAULT 'pending',
  message    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_dates_valid CHECK (end_date >= start_date)
);

-- =====================
-- MATCH_EVALS
-- Every /api/match call logs its input + ranked output here.
-- judge_score is nullable — populated asynchronously by LLM-as-judge.
-- ON DELETE RESTRICT: eval history tied to parent account must not silently vanish.
-- =====================

CREATE TABLE public.match_evals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ranked_teachers jsonb NOT NULL,
  judge_score     integer CHECK (judge_score >= 0 AND judge_score <= 10),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- INDEXES
-- =====================

-- teachers: look up by user_id (profile resolution) and classroom filter
CREATE INDEX idx_teachers_user_id   ON public.teachers(user_id);
CREATE INDEX idx_teachers_classroom ON public.teachers(classroom);

-- availability: all queries filter by teacher_id; date-range searches
CREATE INDEX idx_availability_teacher_id ON public.availability(teacher_id);
CREATE INDEX idx_availability_dates      ON public.availability(start_date, end_date);
-- Partial index: only unbooked slots are ever searched by parents
CREATE INDEX idx_availability_unbooked   ON public.availability(teacher_id, start_date, end_date)
  WHERE is_booked = false;

-- children: parent always looks up own children; classroom used in AI ranking
CREATE INDEX idx_children_parent_id  ON public.children(parent_id);
CREATE INDEX idx_children_classroom  ON public.children(classroom);

-- bookings: parents see own bookings; teachers see incoming requests
CREATE INDEX idx_bookings_parent_id      ON public.bookings(parent_id);
CREATE INDEX idx_bookings_teacher_id     ON public.bookings(teacher_id);
-- Composite for teachers filtering by status (e.g. pending requests only)
CREATE INDEX idx_bookings_teacher_status ON public.bookings(teacher_id, status);

-- match_evals: paginated retrieval for /api/evals; GIN for future JSON queries
CREATE INDEX idx_match_evals_parent_id  ON public.match_evals(parent_id);
CREATE INDEX idx_match_evals_created_at ON public.match_evals(created_at DESC);
CREATE INDEX idx_match_evals_ranked_gin ON public.match_evals USING GIN (ranked_teachers);
