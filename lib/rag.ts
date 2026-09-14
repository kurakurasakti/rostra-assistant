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

import { createServiceClient } from "@/lib/supabase/server"
import type {
  BusinessKnowledgeStructured,
  ConversationExample,
  Profile,
} from "@/types"

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
  const s = profile.business_knowledge_structured as
    | BusinessKnowledgeStructured
    | null
    | undefined

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
  const examples = profile.conversation_examples as
    | ConversationExample[]
    | null
    | undefined

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
 * Re-index all knowledge chunks for a user.
 * Strategy: delete-all-then-insert to keep implementation simple.
 * For very large knowledge bases a diff-based upsert would be more efficient,
 * but for small businesses this is fast enough.
 */
export async function upsertKnowledgeChunks(
  userId: string,
  profile: Profile,
): Promise<{ indexed: number; skipped: number }> {
  const config = getEmbeddingConfig()
  if (!config) {
    console.warn("[RAG] upsertKnowledgeChunks: no embedding key — skipping")
    return { indexed: 0, skipped: 0 }
  }

  const supabase = await createServiceClient()
  const chunks = chunkProfile(profile)

  if (chunks.length === 0) {
    console.log("[RAG] No chunks to index for user:", userId)
    return { indexed: 0, skipped: 0 }
  }

  // Embed all chunks in parallel (rate-limit-friendly: batch of 10 at a time)
  const BATCH_SIZE = 10
  const embedded: Array<KnowledgeChunk & { embedding: number[] }> = []
  let skipped = 0

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
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

  if (embedded.length === 0) {
    console.warn("[RAG] All embedding calls failed for user:", userId)
    return { indexed: 0, skipped: skipped }
  }

  // Delete old chunks for this user
  const { error: deleteErr } = await supabase
    .from("knowledge_chunks")
    .delete()
    .eq("user_id", userId)

  if (deleteErr) {
    console.error("[RAG] Delete old chunks failed:", deleteErr)
    throw deleteErr
  }

  // Insert new chunks
  const rows = embedded.map((c) => ({
    user_id: userId,
    chunk_type: c.chunk_type,
    chunk_text: c.chunk_text,
    metadata: c.metadata,
    embedding: JSON.stringify(c.embedding), // Supabase accepts JSON array for vector
  }))

  const { error: insertErr } = await supabase.from("knowledge_chunks").insert(rows)

  if (insertErr) {
    console.error("[RAG] Insert chunks failed:", insertErr)
    throw insertErr
  }

  console.log(
    `[RAG] Indexed ${embedded.length} chunks for user ${userId} (${skipped} skipped)`,
  )
  return { indexed: embedded.length, skipped }
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
export async function getRagContext(
  userId: string,
  message: string,
): Promise<string> {
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
