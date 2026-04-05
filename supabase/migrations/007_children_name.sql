-- Migration: 007_children_name.sql
-- Adds a display name to the children table.
-- DEFAULT '' preserves existing rows; application layer enforces non-empty on insert.

ALTER TABLE public.children ADD COLUMN name text NOT NULL DEFAULT '';
