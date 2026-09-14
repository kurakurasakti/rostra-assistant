-- =============================================================
-- Migration 010: RAG — Knowledge Chunks with pgvector
-- Run in Supabase SQL Editor
-- =============================================================

-- 1. Enable pgvector extension (requires Supabase Pro or self-hosted)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. knowledge_chunks table
--    Each row is one embeddable unit of business knowledge for a user.
--    chunk_type: 'service' | 'meta' | 'example' | 'raw'
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_type  TEXT        NOT NULL,   -- 'service' | 'meta' | 'example' | 'raw'
  chunk_text  TEXT        NOT NULL,   -- the plain text injected into LLM as context
  metadata    JSONB,                  -- e.g. { "category": "harga", "service_name": "Kebaya" }
  embedding   vector(1536),           -- text-embedding-3-small dimension
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own knowledge chunks"
  ON knowledge_chunks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast ANN search per user
-- ivfflat is suitable for up to ~1M vectors; use hnsw for larger datasets
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

CREATE INDEX IF NOT EXISTS knowledge_chunks_user_id_idx
  ON knowledge_chunks(user_id);

CREATE TRIGGER trg_knowledge_chunks_updated_at
  BEFORE UPDATE ON knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Stored function: cosine similarity search scoped to one user
--    Returns the top-k most relevant chunks for a given query embedding.
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
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
AS $$
  SELECT
    kc.id,
    kc.chunk_type,
    kc.chunk_text,
    kc.metadata,
    1 - (kc.embedding <=> p_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    kc.user_id = p_user_id
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> p_embedding) >= p_threshold
  ORDER BY kc.embedding <=> p_embedding
  LIMIT p_top_k;
$$;
