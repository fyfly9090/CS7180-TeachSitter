-- Migration 006: Add expertise column to teachers
-- Stores teacher's selected areas of expertise as a text array.
-- Defaults to empty array so existing rows are unaffected.

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS expertise text[] NOT NULL DEFAULT '{}';
