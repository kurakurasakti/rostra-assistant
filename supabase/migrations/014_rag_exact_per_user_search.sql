-- =============================================================
-- Migration 014: RAG — exact per-user vector search
-- Run in Supabase SQL Editor
--
-- Why:
-- - match_knowledge_chunks filters by user_id but orders by distance.
--   When the planner picks the global HNSW index, it walks the
--   ef_search (default 40) nearest vectors across ALL tenants and
--   only then applies the user_id filter. As tenant count grows,
--   a user's own chunks fall outside that window → retrieval
--   silently returns fewer/zero rows → prompt falls back or loses
--   facts.
-- - Per-user corpora are tens of rows. An exact scan over the
--   user's rows (via knowledge_chunks_user_id_idx) is both 100%
--   recall and sub-millisecond, so the ANN index is not needed on
--   this path. MATERIALIZED forces filter-first.
-- - Signature unchanged: existing grants/revokes from 013 persist.
--   SET search_path is restated because CREATE OR REPLACE resets
--   function-level config.
-- =============================================================

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  p_user_id   UUID,
  p_embedding vector(1536),
  p_top_k     INT DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id          UUID,
  chunk_type  TEXT,
  chunk_text  TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE sql STABLE
SET search_path = public, extensions, pg_temp
AS $$
  WITH user_chunks AS MATERIALIZED (
    SELECT
      kc.id,
      kc.chunk_type,
      kc.chunk_text,
      kc.metadata,
      1 - (kc.embedding <=> p_embedding) AS similarity
    FROM knowledge_chunks kc
    WHERE kc.user_id = p_user_id
      AND kc.embedding IS NOT NULL
  )
  SELECT uc.id, uc.chunk_type, uc.chunk_text, uc.metadata, uc.similarity
  FROM user_chunks uc
  WHERE uc.similarity >= p_threshold
  ORDER BY uc.similarity DESC
  LIMIT p_top_k;
$$;
