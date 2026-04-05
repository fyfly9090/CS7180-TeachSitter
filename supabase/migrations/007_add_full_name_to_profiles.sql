-- Migration: 007_add_full_name_to_profiles.sql
-- Adds full_name to profiles table so both parents and teachers have
-- a proper display name (not derived from email).

ALTER TABLE public.profiles ADD COLUMN full_name text;

-- Update the trigger to sync full_name from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    (NEW.raw_user_meta_data->>'role')::user_role,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
