-- Add notes column to children for care instructions / special needs.
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
