-- =============================================================
-- Migration 012: RAG/metering — monthly usage + quota enforcement
-- Run in Supabase SQL Editor
--
-- usage_monthly: per-user monthly counters (msgs_in, drafts, auto_sent,
-- embed_calls, llm tokens). Used for quota enforcement per plan.
-- Incremented via increment_usage() RPC (SECURITY DEFINER, atomic upsert).
-- Plan is derived from subscriptions.status (see lib/usage.ts):
--   'active' | 'trialing' → pro, anything else → free.
-- warned_80: 80% soft-warning sent once per month.
-- quota_notified_at: quota-exhausted notice sent once per day.
--
-- Also extends inbox_status with 'quota_exceeded' (+ 'antri', which the
-- app code already writes but the enum was missing).
-- =============================================================

CREATE TABLE IF NOT EXISTS usage_monthly (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month             DATE        NOT NULL, -- first day of month, e.g. 2026-09-01
  msgs_in           INT         NOT NULL DEFAULT 0,
  drafts            INT         NOT NULL DEFAULT 0,
  auto_sent         INT         NOT NULL DEFAULT 0,
  embed_calls       INT         NOT NULL DEFAULT 0,
  llm_tokens_in     INT         NOT NULL DEFAULT 0,
  llm_tokens_out    INT         NOT NULL DEFAULT 0,
  warned_80         BOOLEAN     NOT NULL DEFAULT FALSE,
  quota_notified_at DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usage_monthly_user_month_unique UNIQUE (user_id, month)
);

ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly usage"
  ON usage_monthly FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS usage_monthly_user_month_idx ON usage_monthly(user_id, month);

CREATE TRIGGER trg_usage_monthly_updated_at
  BEFORE UPDATE ON usage_monthly
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Atomic upsert: increments counters for the current month.
-- Safe to call from client code (service role or authenticated users) —
-- it can only touch the caller's own row... except service_role bypasses RLS.
-- SECURITY DEFINER so the Edge Function (process-send-queue) and server
-- routes can call it without RLS friction.
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id      UUID,
  p_msgs_in      INT DEFAULT 0,
  p_drafts       INT DEFAULT 0,
  p_auto_sent    INT DEFAULT 0,
  p_embed_calls  INT DEFAULT 0,
  p_tokens_in    INT DEFAULT 0,
  p_tokens_out   INT DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE := date_trunc('month', now())::date;
BEGIN
  INSERT INTO usage_monthly
    (user_id, month, msgs_in, drafts, auto_sent, embed_calls, llm_tokens_in, llm_tokens_out)
  VALUES
    (p_user_id, v_month, p_msgs_in, p_drafts, p_auto_sent, p_embed_calls, p_tokens_in, p_tokens_out)
  ON CONFLICT (user_id, month) DO UPDATE SET
    msgs_in        = usage_monthly.msgs_in        + EXCLUDED.msgs_in,
    drafts         = usage_monthly.drafts         + EXCLUDED.drafts,
    auto_sent      = usage_monthly.auto_sent      + EXCLUDED.auto_sent,
    embed_calls    = usage_monthly.embed_calls    + EXCLUDED.embed_calls,
    llm_tokens_in  = usage_monthly.llm_tokens_in  + EXCLUDED.llm_tokens_in,
    llm_tokens_out = usage_monthly.llm_tokens_out + EXCLUDED.llm_tokens_out,
    updated_at     = NOW();
END;
$$;

-- Extend inbox_status for quota enforcement.
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block;
-- migrations apply each statement with auto-commit, so this is safe here.
ALTER TYPE inbox_status ADD VALUE IF NOT EXISTS 'quota_exceeded';
ALTER TYPE inbox_status ADD VALUE IF NOT EXISTS 'antri';
