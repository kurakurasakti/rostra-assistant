/**
 * lib/rag.ts
 *
 * Retrieval-Augmented Generation helpers.
 *
 * Architecture
 * ─────────────
 * 1. INDEXING (happens when business knowledge is saved)
 *    Profile → chunkProfile() → embedText() → upsertKnowledgeChunks()
 *
 * 2. RETRIEVAL (happens on every incoming message)
 *    Message → embedText() → match_knowledge_chunks() → top-K chunks
 *    → injected into the system prompt instead of the full context
 *
 * Embedding model
 * ───────────────
 * Uses OpenAI text-embedding-3-small (1536 dims) via:
 *   1. OPENAI_API_KEY (direct) — cheapest
 *   2. OPENROUTER_API_KEY — routed via OpenRouter
 * Falls back gracefully (returns empty) if no key is set, so the app
 * still works without RAG using the existing context-stuffing path.
 */

import { createHash } from "node:crypto"
import { createServiceClient } from "@/lib/supabase/server"
import type { BusinessKnowledgeStructured, ConversationExample, Profile } from "@/types"

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface KnowledgeChunk {
  chunk_type: "service" | "meta" | "example" | "raw"
  chunk_text: string
  metadata: Record<string, unknown>
}

// ── EMBEDDING ─────────────────────────────────────────────────────────────────

const EMBEDDING_DIMS = 1536

function getEmbeddingConfig(): { base: string; apiKey: string; model: string } | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      base: "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      model: "text-embedding-3-small", // Direct OpenAI expects this
    }
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      base: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      // OpenRouter requires the provider prefix:
      model: process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small",
    }
  }
  return null
}

/** True when an embedding API key is configured (RAG can index). */
export function hasEmbeddingKey(): boolean {
  return getEmbeddingConfig() !== null
}

/**
 * Embed a single string.
 * Returns null if no embedding key is configured.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const config = getEmbeddingConfig()
  if (!config) {
    console.warn("[RAG] No embedding API key set — RAG disabled")
    return null
  }

  const clean = text.replace(/\s+/g, " ").trim().slice(0, 8000) // token safety
  if (!clean) return null

  try {
    const res = await fetch(`${config.base}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://glim.app",
      },
      body: JSON.stringify({
        model: config.model,
        input: clean,
        dimensions: EMBEDDING_DIMS, // Note: Not all OpenRouter models support the dimensions parameter
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Embedding API ${res.status}: ${body}`)
    }

    const data = await res.json()
    return data.data?.[0]?.embedding ?? null
  } catch (err) {
    console.error("[RAG] embedText failed:", err)
    return null
  }
}

// ── CHUNKING ──────────────────────────────────────────────────────────────────

/**
 * Split a profile into discrete, embeddable knowledge chunks.
 *
 * Chunk strategy:
 * - One chunk per service/product → precise price/availability retrieval
 * - One "meta" chunk for hours, location, payment, PO status, special notes
 * - One chunk per conversation_example → style/tone retrieval
 * - One "raw" chunk per paragraph of business_knowledge_raw (if no structured)
 */
export function chunkProfile(profile: Profile): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = []

  // ── 1. Structured knowledge ──────────────────────────────────────────────
  const s = profile.business_knowledge_structured as BusinessKnowledgeStructured | null | undefined

  if (s) {
    // Service chunks — one per service so retrieval is precise
    for (const svc of s.services ?? []) {
      const text = [
        `Layanan: ${svc.name}`,
        `Harga: ${svc.price_range}`,
        svc.description ? `Keterangan: ${svc.description}` : null,
      ]
        .filter(Boolean)
        .join("\n")

      chunks.push({
        chunk_type: "service",
        chunk_text: text,
        metadata: { service_name: svc.name, category: "harga" },
      })
    }

    // Meta chunk — one combined chunk for operational info
    const metaParts: string[] = []
    if (s.operating_hours) metaParts.push(`Jam operasional: ${s.operating_hours}`)
    if (s.location) metaParts.push(`Lokasi: ${s.location}`)
    if (s.payment_methods?.length)
      metaParts.push(`Metode pembayaran: ${s.payment_methods.join(", ")}`)
    metaParts.push(
      s.po_status
        ? `Open PO: Buka${s.po_close_date ? ` sampai ${s.po_close_date}` : ""}`
        : "Open PO: Tutup",
    )
    if (s.special_notes) metaParts.push(`Catatan khusus: ${s.special_notes}`)

    if (metaParts.length > 0) {
      chunks.push({
        chunk_type: "meta",
        chunk_text: metaParts.join("\n"),
        metadata: { category: "meta" },
      })
    }
  }

  // ── 2. Raw knowledge fallback ────────────────────────────────────────────
  // Only use raw if there's no structured data (to avoid duplication)
  if (!s && profile.business_knowledge_raw) {
    const paragraphs = profile.business_knowledge_raw
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20) // skip tiny fragments

    for (const para of paragraphs) {
      chunks.push({
        chunk_type: "raw",
        chunk_text: para,
        metadata: { category: "raw" },
      })
    }
  }

  // ── 3. Conversation examples ─────────────────────────────────────────────
  const examples = profile.conversation_examples as ConversationExample[] | null | undefined

  for (const ex of examples ?? []) {
    chunks.push({
      chunk_type: "example",
      chunk_text: `Pertanyaan pelanggan: "${ex.customer}"\nJawaban admin: "${ex.admin}"`,
      metadata: { category: ex.category, source: ex.source },
    })
  }

  return chunks
}

// ── INDEXING ──────────────────────────────────────────────────────────────────

/**
 * sha256(chunk_type + "\n" + chunk_text) — must match the backfill in
 * migration 011 exactly (digest(chunk_type || E'\n' || chunk_text, 'sha256')).
 */
export function hashChunk(chunkType: string, chunkText: string): string {
  return createHash("sha256").update(`${chunkType}\n${chunkText}`).digest("hex")
}

export type HashedChunk = KnowledgeChunk & { content_hash: string }

export interface ChunkDiff {
  toInsert: HashedChunk[]
  toDeleteIds: string[]
  reused: number
}

/**
 * Multiset diff between existing DB rows and desired chunks.
 * Identical (type+text) chunks produce identical hashes, so matching is done
 * per-hash-bucket: each desired chunk consumes at most one existing row.
 */
export function diffChunks(
  existing: Array<{ id: string; content_hash: string | null }>,
  desired: HashedChunk[],
): ChunkDiff {
  const buckets = new Map<string, string[]>()
  const nullHashIds: string[] = []
  for (const row of existing) {
    if (!row.content_hash) {
      // Legacy rows without a hash can never match — delete them.
      nullHashIds.push(row.id)
      continue
    }
    const bucket = buckets.get(row.content_hash) ?? []
    bucket.push(row.id)
    buckets.set(row.content_hash, bucket)
  }

  const toInsert: HashedChunk[] = []
  let reused = 0

  for (const chunk of desired) {
    const bucket = buckets.get(chunk.content_hash)
    if (bucket && bucket.length > 0) {
      bucket.shift()
      reused++
    } else {
      toInsert.push(chunk)
    }
  }

  const toDeleteIds: string[] = [...nullHashIds]
  for (const bucket of buckets.values()) {
    toDeleteIds.push(...bucket)
  }

  return { toInsert, toDeleteIds, reused }
}

export interface ReindexResult {
  indexed: number
  reused: number
  deleted: number
  skipped: number
}

/**
 * Re-index knowledge chunks for a user (diff-based).
 *
 * Chunks whose content_hash already exists in the DB are reused as-is
 * (zero embedding calls). Only new/changed chunks are embedded and inserted;
 * chunks that disappeared from the profile are deleted. Deletes only happen
 * when all required embeddings succeeded (or nothing needed embedding), so a
 * transient embedding API failure can never wipe the index.
 */
export async function upsertKnowledgeChunks(
  userId: string,
  profile: Profile,
): Promise<ReindexResult> {
  const empty: ReindexResult = { indexed: 0, reused: 0, deleted: 0, skipped: 0 }

  const config = getEmbeddingConfig()
  if (!config) {
    console.warn("[RAG] upsertKnowledgeChunks: no embedding key — skipping")
    return empty
  }

  const supabase = await createServiceClient()
  const desired: HashedChunk[] = chunkProfile(profile).map((c) => ({
    ...c,
    content_hash: hashChunk(c.chunk_type, c.chunk_text),
  }))

  const { data: existingRows, error: fetchErr } = await supabase
    .from("knowledge_chunks")
    .select("id, content_hash")
    .eq("user_id", userId)

  if (fetchErr) {
    console.error("[RAG] Fetch existing chunks failed:", fetchErr)
    throw fetchErr
  }

  const diff = diffChunks(existingRows ?? [], desired)

  if (diff.toInsert.length === 0 && diff.toDeleteIds.length === 0) {
    console.log(`[RAG] No changes for user ${userId} (${diff.reused} reused)`)
    await markIndexed(supabase, userId)
    return { ...empty, reused: diff.reused }
  }

  // Embed only new/changed chunks (batch of 10 at a time)
  const BATCH_SIZE = 10
  const embedded: Array<HashedChunk & { embedding: number[] }> = []
  let skipped = 0

  for (let i = 0; i < diff.toInsert.length; i += BATCH_SIZE) {
    const batch = diff.toInsert.slice(i, i + BATCH_SIZE)
    const embeddings = await Promise.all(batch.map((c) => embedText(c.chunk_text)))

    for (let j = 0; j < batch.length; j++) {
      const emb = embeddings[j]
      if (emb) {
        embedded.push({ ...batch[j], embedding: emb })
      } else {
        skipped++
      }
    }
  }

  // Abort on embedding failure: never shrink the index on transient errors.
  if (diff.toInsert.length > 0 && embedded.length === 0) {
    console.warn("[RAG] All embedding calls failed for user:", userId)
    return { ...empty, reused: diff.reused, skipped }
  }

  if (embedded.length > 0) {
    const rows = embedded.map((c) => ({
      user_id: userId,
      chunk_type: c.chunk_type,
      chunk_text: c.chunk_text,
      metadata: c.metadata,
      content_hash: c.content_hash,
      embedding: JSON.stringify(c.embedding), // Supabase accepts JSON array for vector
    }))

    const { error: insertErr } = await supabase.from("knowledge_chunks").insert(rows)

    if (insertErr) {
      console.error("[RAG] Insert chunks failed:", insertErr)
      throw insertErr
    }
  }

  let deleted = 0
  if (diff.toDeleteIds.length > 0) {
    const { error: deleteErr } = await supabase
      .from("knowledge_chunks")
      .delete()
      .in("id", diff.toDeleteIds)

    if (deleteErr) {
      console.error("[RAG] Delete stale chunks failed:", deleteErr)
      throw deleteErr
    }
    deleted = diff.toDeleteIds.length
  }

  await markIndexed(supabase, userId)

  console.log(
    `[RAG] Indexed ${embedded.length} new chunks for user ${userId} ` +
      `(${diff.reused} reused, ${deleted} deleted, ${skipped} skipped)`,
  )
  return { indexed: embedded.length, reused: diff.reused, deleted, skipped }
}

/** Best-effort bookkeeping: last_indexed_at = now, clear rag_dirty_at. */
async function markIndexed(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
): Promise<void> {
  try {
    await supabase
      .from("profiles")
      .update({ last_indexed_at: new Date().toISOString(), rag_dirty_at: null })
      .eq("id", userId)
  } catch (err) {
    console.warn("[RAG] markIndexed failed (non-fatal):", err)
  }
}

// ── THROTTLED REINDEX (correction feedback loop) ─────────────────────────────

export const REINDEX_THROTTLE_MS = 60_000

/** Pure throttle decision: reindex now, or defer via dirty flag? */
export function shouldReindexNow(
  lastIndexedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!lastIndexedAt) return true
  return now - new Date(lastIndexedAt).getTime() > REINDEX_THROTTLE_MS
}

/**
 * Reindex after an owner correction. Throttled: if the last reindex was less
 * than REINDEX_THROTTLE_MS ago, only sets profiles.rag_dirty_at — the catch-up
 * in buildAIContext() picks it up before the next retrieval.
 * Never throws: on failure it marks the profile dirty for later retry.
 */
export async function reindexAfterCorrection(userId: string): Promise<void> {
  try {
    const supabase = await createServiceClient()
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single()
    if (!profile) return

    if (shouldReindexNow(profile.last_indexed_at)) {
      await upsertKnowledgeChunks(userId, profile as Profile)
    } else {
      await supabase
        .from("profiles")
        .update({ rag_dirty_at: new Date().toISOString() })
        .eq("id", userId)
    }
  } catch (err) {
    console.error("[RAG] reindexAfterCorrection failed, marking dirty:", err)
    try {
      const supabase = await createServiceClient()
      await supabase
        .from("profiles")
        .update({ rag_dirty_at: new Date().toISOString() })
        .eq("id", userId)
    } catch {
      // give up silently — never break the send flow
    }
  }
}

/**
 * Catch-up before retrieval: if a correction arrived while throttled,
 * reindex now so the fresh example is visible to RAG.
 * Never throws — a failed reindex falls back to the stale index.
 */
export async function reindexIfDirty(
  userId: string,
  profile: Profile & { rag_dirty_at?: string | null },
): Promise<void> {
  if (!profile.rag_dirty_at) return
  try {
    console.log("[RAG] rag_dirty_at set — catch-up reindex for user:", userId)
    await upsertKnowledgeChunks(userId, profile)
  } catch (err) {
    console.warn("[RAG] catch-up reindex failed, continuing with stale index:", err)
  }
}

// ── RETRIEVAL ─────────────────────────────────────────────────────────────────

/**
 * Retrieve the top-K most relevant knowledge chunks for an incoming message.
 * Returns an array of chunk_text strings ready to be injected into the prompt.
 * Returns empty array if RAG is not configured or retrieval fails.
 */
export async function retrieveRelevantChunks(
  userId: string,
  query: string,
  topK = 5,
  threshold = 0.3,
): Promise<string[]> {
  const embedding = await embedText(query)
  if (!embedding) return []

  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      p_user_id: userId,
      p_embedding: JSON.stringify(embedding),
      p_top_k: topK,
      p_threshold: threshold,
    })

    if (error) {
      console.error("[RAG] retrieveRelevantChunks RPC error:", error)
      return []
    }

    const results = (data ?? []) as Array<{
      chunk_text: string
      chunk_type: string
      similarity: number
    }>

    console.log(
      `[RAG] Retrieved ${results.length} chunks for query "${query.slice(0, 40)}..."`,
      results.map((r) => `[${r.chunk_type}] sim=${r.similarity.toFixed(3)}`),
    )

    return results.map((r) => r.chunk_text)
  } catch (err) {
    console.error("[RAG] retrieveRelevantChunks failed:", err)
    return []
  }
}

/**
 * High-level helper: retrieve and format chunks into a prompt section.
 * Returns empty string if nothing found (caller falls back to full context).
 */
export async function getRagContext(userId: string, message: string): Promise<string> {
  const chunks = await retrieveRelevantChunks(userId, message)
  if (chunks.length === 0) return ""

  return `=== INFORMASI RELEVAN (DIAMBIL OTOMATIS) ===\n${chunks.join("\n\n")}`
}

// ── CHUNK COUNT ───────────────────────────────────────────────────────────────

/** Return how many chunks are indexed for a user (for UI display). */
export async function getChunkCount(userId: string): Promise<number> {
  try {
    const supabase = await createServiceClient()
    const { count } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    return count ?? 0
  } catch {
    return 0
  }
}
