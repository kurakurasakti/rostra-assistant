-- =============================================================
-- Glim — Privilege Escalation Fix & Function Hardening
-- Migration: 013_privilege_escalation_and_function_hardening.sql
--
-- Applied directly to production (project dpeyfucyrhyuhliitcfd) via
-- supabase MCP execute_sql on 2026-09-30. This file records the exact
-- state so a fresh environment reproduces production.
--
-- Context: migration 009 was never applied to the live database.
-- The `role` column, `is_admin()`, and `prevent_self_role_upgrade()`
-- trigger did not exist, leaving the `profiles` UPDATE policy's
-- WITH CHECK (auth.uid() = id) as the only guard — which does not
-- constrain the `is_admin` column. Any authenticated user could set
-- is_admin = true on their own row and gain access to every
-- /api/admin/* route.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Role columns
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON public.profiles(is_admin);

-- Backfill: anyone already flagged is_admin is a real admin.
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true AND role IS DISTINCT FROM 'admin';

-- ─────────────────────────────────────────────────────────────
-- 2. is_admin() — SECURITY DEFINER, search_path pinned
--
-- SECURITY DEFINER is genuinely required here: RLS on profiles means
-- a policy cannot subquery profiles to check admin status without
-- recursing. It stays safe because EXECUTE is revoked from anon and
-- the function takes no caller-supplied identity argument — it reads
-- auth.uid() only.
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ─────────────────────────────────────────────────────────────
-- 3. prevent_self_role_upgrade() — the actual escalation fix
--
-- BLOCKING TRIGGER. RLS cannot express this: WITH CHECK constrains
-- only the columns it references, so ownership alone permits
-- writing is_admin. This trigger rejects any role/is_admin change
-- from a non-admin session. Service-role and migration writes have
-- auth.uid() = NULL and pass through.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_self_role_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_admin IS DISTINCT FROM OLD.is_admin) THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify user role or admin status.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_self_role_upgrade ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_upgrade
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_upgrade();

-- ─────────────────────────────────────────────────────────────
-- 4. Function EXECUTE grants
--
-- Postgres grants EXECUTE to PUBLIC on every new function, so
-- SECURITY DEFINER functions in public are callable by anon unless
-- explicitly revoked. Revoking from `anon` alone is not sufficient
-- where an explicit PUBLIC grant also exists.
-- ─────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Trigger function: only the owner (postgres) should ever invoke it.
REVOKE ALL ON FUNCTION public.prevent_self_role_upgrade() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_self_role_upgrade() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_self_role_upgrade() FROM authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. increment_feedback_count — ownership check added
--
-- Previously accepted any caller-supplied uid, so any anon client
-- could inflate any user's feedback_count. Now restricted to the
-- caller themself (or an admin). Called only from
-- app/api/messages/send/route.ts with the session user id.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_feedback_count(uid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  update public.profiles
  set feedback_count = coalesce(feedback_count, 0) + 1
  where id = uid
    AND auth.uid() IS NOT NULL
    AND (uid = auth.uid() OR public.is_admin());
$$;

REVOKE ALL ON FUNCTION public.increment_feedback_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_feedback_count(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_feedback_count(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. Trigger helper functions — search_path pinned, no anon EXECUTE
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

ALTER FUNCTION public.seed_default_templates() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.match_knowledge_chunks(uuid, vector, integer, double precision)
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.seed_default_templates() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks(uuid, vector, integer, double precision)
  FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. Policies — explicit TO authenticated + admin bypass
--
-- TO authenticated is scoped explicitly rather than relying on
-- auth.role(), which breaks silently when anonymous sign-ins are
-- enabled. Every predicate wraps the call in a scalar subquery so
-- the planner evaluates it once instead of per row.
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT public.is_admin()))
  WITH CHECK ((SELECT auth.uid()) = id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can update own invoices proof" ON public.invoices;
CREATE POLICY "Users can update own invoices proof"
  ON public.invoices FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can view auth security logs" ON public.auth_security_logs;
CREATE POLICY "Admins can view auth security logs"
  ON public.auth_security_logs FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- ─────────────────────────────────────────────────────────────
-- 8. Private payment-proofs bucket + storage RLS
--
-- The bucket did not exist in production while
-- app/api/payment/[invoiceId]/proof/route.ts already uploaded to it.
-- INSERT + SELECT + UPDATE are all required for upsert to work; a
-- bucket with only INSERT silently fails file replacement.
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  FALSE,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "payment_proofs_insert_own" ON storage.objects;
CREATE POLICY "payment_proofs_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "payment_proofs_select_own_or_admin" ON storage.objects;
CREATE POLICY "payment_proofs_select_own_or_admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      (SELECT auth.uid())::text = (storage.foldername(name))[1]
      OR (SELECT public.is_admin())
    )
  );

DROP POLICY IF EXISTS "payment_proofs_update_own" ON storage.objects;
CREATE POLICY "payment_proofs_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "payment_proofs_delete_own_or_admin" ON storage.objects;
CREATE POLICY "payment_proofs_delete_own_or_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      (SELECT auth.uid())::text = (storage.foldername(name))[1]
      OR (SELECT public.is_admin())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 9. Verification (run after applying)
--
--   -- escalation blocked
--   begin;
--     select set_config('request.jwt.claims',
--       '{"sub":"<non-admin-uuid>","role":"authenticated"}', true);
--     set local role authenticated;
--     update public.profiles set is_admin = true where id = '<non-admin-uuid>';
--   rollback;
--   -- expect: ERROR 42501 Unauthorized: Only administrators can modify
--
--   -- anon cannot read other users
--   begin;
--     select set_config('request.jwt.claims', '{}', true);
--     set local role anon;
--     select count(*) from public.profiles;  -- expect 0
--   rollback;
--
-- NOT COVERED HERE (requires dashboard/auth-server config):
--   - auth_leaked_password_protection -> Auth > Providers > enable
--   - chat-media bucket is still public=true (URL-readable by anyone
--     who obtains the URL). Making it private requires switching
--     app/(dashboard)/inbox/page.tsx to signed URLs, because it
--     renders stored media_url values directly in <img> and <a>.
-- =============================================================