-- =============================================================
-- Glim — AI Usage & Token Tracking (Daily Token Cap & Rate Limit)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day         DATE        NOT NULL DEFAULT CURRENT_DATE,
  requests    INTEGER     NOT NULL DEFAULT 0,
  est_tokens  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_usage_user_day_unique UNIQUE (user_id, day)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own AI usage"
  ON public.ai_usage FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_usage_user_id_day_idx ON public.ai_usage(user_id, day);
