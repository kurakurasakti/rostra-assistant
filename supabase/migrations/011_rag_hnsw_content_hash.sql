-- =============================================================
-- Migration 011: RAG — HNSW index + content_hash for diff reindex
-- Run in Supabase SQL Editor
--
-- Why:
-- - ivfflat (lists=50) has poor recall for small per-user corpora
--   (tens of chunks). HNSW is the right index at this scale.
-- - content_hash enables diff-based reindex: unchanged chunks are
--   not re-embedded, changed chunks are upserted, removed chunks
--   are deleted. No more delete-all-then-insert.
-- - profiles.last_indexed_at / rag_dirty_at support throttled
--   reindex after owner corrections (see app/api/messages/send).
-- =============================================================

-- 1. pgcrypto for sha256 backfill of content_hash
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Replace ivfflat with HNSW
DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. content_hash on knowledge_chunks
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Backfill existing rows: sha256(chunk_type + "\n" + chunk_text)
-- Must match lib/rag.ts hashChunk() exactly.
UPDATE knowledge_chunks
SET content_hash = encode(digest(chunk_type || E'\n' || chunk_text, 'sha256'), 'hex')
WHERE content_hash IS NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunks_user_hash_idx
  ON knowledge_chunks(user_id, content_hash);

-- 4. Reindex bookkeeping on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rag_dirty_at TIMESTAMPTZ;
