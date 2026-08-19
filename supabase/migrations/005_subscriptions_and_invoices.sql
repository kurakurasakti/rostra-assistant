-- =============================================================
-- Glim — Subscriptions & Invoices Schema (Phase: Payment & Billing)
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Subscriptions Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id              TEXT        NOT NULL DEFAULT 'glim_pro_monthly',
  status               TEXT        NOT NULL DEFAULT 'trialing', -- 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
  trial_ends_at        TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);


-- ─────────────────────────────────────────────────────────────
-- 2. Invoices Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT          NOT NULL UNIQUE,
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID          REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id         TEXT          NOT NULL,
  plan_name       TEXT          NOT NULL,
  base_amount     NUMERIC(15,2) NOT NULL,
  unique_code     INT           NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL,
  currency        TEXT          NOT NULL DEFAULT 'IDR',
  status          TEXT          NOT NULL DEFAULT 'pending', -- 'pending' | 'waiting_confirmation' | 'paid' | 'expired' | 'cancelled'
  payment_method  TEXT          NOT NULL DEFAULT 'qris_manual', -- 'qris_manual' | 'bank_transfer_bca' | 'bank_transfer_mandiri' | 'xendit_invoice'
  provider        TEXT          NOT NULL DEFAULT 'manual', -- 'manual' | 'xendit'
  provider_id     TEXT,
  provider_data   JSONB         DEFAULT '{}'::jsonb,
  proof_url       TEXT,
  sender_name     TEXT,
  sender_bank     TEXT,
  customer_notes  TEXT,
  admin_notes     TEXT,
  paid_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ   NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices proof"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_invoice_number_idx ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);
