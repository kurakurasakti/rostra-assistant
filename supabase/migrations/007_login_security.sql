-- =============================================================
-- Glim — Login Security & Audit Logs (Anti-Bruteforce Defense)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.auth_security_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL, -- 'login_success' | 'login_failed' | 'login_lockout' | 'honeypot_triggered'
  ip_address  TEXT,
  email       TEXT,
  user_agent  TEXT,
  details     JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auth_security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view auth security logs"
  ON public.auth_security_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

CREATE INDEX IF NOT EXISTS auth_security_logs_event_type_idx ON public.auth_security_logs(event_type);
CREATE INDEX IF NOT EXISTS auth_security_logs_email_idx ON public.auth_security_logs(email);
CREATE INDEX IF NOT EXISTS auth_security_logs_ip_idx ON public.auth_security_logs(ip_address);
CREATE INDEX IF NOT EXISTS auth_security_logs_created_at_idx ON public.auth_security_logs(created_at);
