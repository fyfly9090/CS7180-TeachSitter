-- Migration 005: Add full_name and position to teachers table.
-- full_name: display name shown on teacher cards (e.g. "Ms. Tara Smith").
-- position: job title shown on teacher cards (e.g. "Preschool Teacher").
-- Both are optional; the UI falls back to email-derived name and "Preschool Teacher" if null.

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS position  text;
