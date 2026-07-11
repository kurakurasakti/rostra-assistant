-- Tracks whether the user has seen the first-login onboarding wizard.
-- NULL = never seen; set once on skip/finish, wizard never shows again.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_wizard_seen_at TIMESTAMPTZ;
