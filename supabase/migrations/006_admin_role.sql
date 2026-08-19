-- =============================================================
-- Glim — Admin Role & Authorization
-- =============================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON public.profiles(is_admin);
