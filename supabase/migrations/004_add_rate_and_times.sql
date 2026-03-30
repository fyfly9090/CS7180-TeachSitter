-- Migration: 004_add_rate_and_times.sql
-- Adds hourly_rate to teachers and start_time/end_time to availability.

ALTER TABLE public.teachers
  ADD COLUMN hourly_rate numeric(6,2);

ALTER TABLE public.availability
  ADD COLUMN start_time time,
  ADD COLUMN end_time   time,
  ADD CONSTRAINT availability_times_valid CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  );
