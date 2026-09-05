-- =============================================================
-- Glim — Security Hardening: RLS, Private Storage & Role Defense
-- Migration: 009_security_hardening.sql
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Security Definer Function: is_admin()
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = TRUE OR profiles.role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
-- 2. Profiles Table: Role Columns & Role-Upgrade Defense Trigger
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON public.profiles(is_admin);

-- Trigger function to prevent non-admins from upgrading their own role or admin status
CREATE OR REPLACE FUNCTION public.prevent_self_role_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_admin IS DISTINCT FROM OLD.is_admin) THEN
    -- If user is authenticated and is NOT an admin, block the update
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify user role or admin status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_self_role_upgrade ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_upgrade
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_upgrade();

-- ─────────────────────────────────────────────────────────────
-- 3. RLS Policies Hardening for Public Tables
-- ─────────────────────────────────────────────────────────────

-- Profiles: Users can view/update their own profile, Admins can view all
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Invoices: Users manage own invoices, Admins can view/update all
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own invoices proof" ON public.invoices;
CREATE POLICY "Users can update own invoices proof"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Subscriptions: Users view own subscription, Admins can view/update all
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Auth Security Logs: Admin only
DROP POLICY IF EXISTS "Admins can view auth security logs" ON public.auth_security_logs;
CREATE POLICY "Admins can view auth security logs"
  ON public.auth_security_logs FOR SELECT
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 4. Storage Bucket: payment-proofs (PRIVATE) & Storage RLS
-- ─────────────────────────────────────────────────────────────

-- Create/update bucket with public = FALSE, 3MB file size limit, and image mime whitelist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  FALSE,
  3145728, -- 3MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage RLS: INSERT (Only authenticated users into their own userId folder)
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs to own folder" ON storage.objects;
CREATE POLICY "Authenticated users can upload payment proofs to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: SELECT (Owner or Admin)
DROP POLICY IF EXISTS "Users can view own payment proof or admins can view all" ON storage.objects;
CREATE POLICY "Users can view own payment proof or admins can view all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

-- Storage RLS: UPDATE (Owner or Admin)
DROP POLICY IF EXISTS "Users can update own payment proofs" ON storage.objects;
CREATE POLICY "Users can update own payment proofs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: DELETE (Owner or Admin)
DROP POLICY IF EXISTS "Users can delete own payment proofs" ON storage.objects;
CREATE POLICY "Users can delete own payment proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );
