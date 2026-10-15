/**
 * src/__tests__/utils/rag.test.ts
 *
 * Unit tests for the RAG module (lib/rag.ts) and its integration with
 * buildSecurePrompt (lib/openrouter.ts).
 *
 * These tests run fully offline — no DB or embedding API needed.
 * They test: chunking logic, prompt assembly, and fallback behaviour.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { buildSecurePrompt } from "@/lib/openrouter"
import {
  chunkProfile,
  diffChunks,
  embedTexts,
  type HashedChunk,
  hashChunk,
  REINDEX_THROTTLE_MS,
  shouldReindexNow,
} from "@/lib/rag"
import type { Profile } from "@/types"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_PROFILE: Profile = {
  id: "test-user-id",
  business_name: "Butik Cantik",
  brand_voice: "Sapa dengan 'Kak'. Ramah dan singkat.",
  wa_connected: true,
  onboarding_complete: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const PROFILE_WITH_STRUCTURED: Profile = {
  ...BASE_PROFILE,
  business_knowledge_structured: {
    services: [
      { name: "Kebaya Modern", price_range: "750rb–2jt", description: "Bahan premium" },
      { name: "Gaun Pesta", price_range: "1jt–3jt" },
    ],
    operating_hours: "Senin–Sabtu 09.00–17.00",
    location: "Jl. Sudirman No. 10, Jakarta",
    payment_methods: ["BCA", "GoPay", "OVO"],
    po_status: true,
    po_close_date: "2026-10-31",
    special_notes: "Minimal DP 50%",
  },
}

const PROFILE_WITH_EXAMPLES: Profile = {
  ...PROFILE_WITH_STRUCTURED,
  conversation_examples: [
    {
      category: "harga",
      customer: "Berapa harga kebaya?",
      admin: "Harga kebaya mulai 750rb Kak 😊",
      source: "correction",
      used_count: 3,
      created_at: new Date().toISOString(),
    },
    {
      category: "jadwal",
      customer: "Kapan bisa fitting?",
      admin: "Bisa fitting Senin–Sabtu ya Kak, tinggal pilih jam 🙏",
      source: "upload",
      used_count: 1,
      created_at: new Date().toISOString(),
    },
  ],
}

const PROFILE_WITH_RAW_ONLY: Profile = {
  ...BASE_PROFILE,
  business_knowledge_raw:
    "Kami menjual kebaya modern mulai 750rb.\n\nPembayaran bisa via BCA atau GoPay.\n\nJam buka Senin sampai Sabtu pukul 9 pagi.",
}

// ── chunkProfile() ────────────────────────────────────────────────────────────

describe("chunkProfile()", () => {
  it("does NOT chunk structured knowledge (it is always in the static prompt)", () => {
    const chunks = chunkProfile(PROFILE_WITH_STRUCTURED)
    expect(chunks).toHaveLength(0)
  })

  it("produces example chunks equal to conversation_examples count", () => {
    const chunks = chunkProfile(PROFILE_WITH_EXAMPLES)
    const exampleChunks = chunks.filter((c) => c.chunk_type === "example")
    expect(exampleChunks).toHaveLength(2)
  })

  it("example chunk contains customer question and admin answer", () => {
    const chunks = chunkProfile(PROFILE_WITH_EXAMPLES)
    const ex = chunks.find((c) => c.chunk_text.includes("Berapa harga kebaya"))!
    expect(ex.chunk_text).toContain("750rb")
    expect(ex.metadata.category).toBe("harga")
  })

  it("falls back to raw chunks when no structured data exists", () => {
    const chunks = chunkProfile(PROFILE_WITH_RAW_ONLY)
    const rawChunks = chunks.filter((c) => c.chunk_type === "raw")
    // 3 paragraphs separated by blank lines
    expect(rawChunks.length).toBeGreaterThanOrEqual(2)
    expect(rawChunks.every((c) => c.chunk_text.length > 20)).toBe(true)
  })

  it("does NOT produce raw chunks when structured data exists", () => {
    const chunks = chunkProfile(PROFILE_WITH_STRUCTURED)
    const rawChunks = chunks.filter((c) => c.chunk_type === "raw")
    expect(rawChunks).toHaveLength(0)
  })

  it("returns empty array for empty profile", () => {
    const chunks = chunkProfile(BASE_PROFILE)
    expect(chunks).toHaveLength(0)
  })
})

// ── buildSecurePrompt() + RAG integration ─────────────────────────────────────

describe("buildSecurePrompt() — RAG integration", () => {
  it("injects ragContext into the prompt when provided", () => {
    const ragContext = "=== INFORMASI RELEVAN ===\nKebaya Modern: 750rb–2jt"
    const prompt = buildSecurePrompt(
      PROFILE_WITH_STRUCTURED,
      null,
      "",
      "",
      undefined,
      "berapa harga kebaya",
      ragContext,
    )
    expect(prompt).toContain(ragContext)
  })

  it("keeps full static business knowledge when ragContext is provided", () => {
    const ragContext = "=== INFORMASI RELEVAN ===\nsome chunk"
    const prompt = buildSecurePrompt(
      PROFILE_WITH_STRUCTURED,
      null,
      "",
      "",
      undefined,
      "halo kak",
      ragContext,
    )
    expect(prompt).toContain("=== PENGETAHUAN BISNIS ===")
    expect(prompt).toContain("Senin–Sabtu 09.00–17.00")
    expect(prompt).toContain("Kebaya Modern")
  })

  it("places ragContext after the static prefix so the prefix stays cacheable", () => {
    const withRag = buildSecurePrompt(
      PROFILE_WITH_EXAMPLES,
      null,
      "",
      "",
      undefined,
      "berapa harga",
      "=== INFORMASI RELEVAN ===\nchunk A",
    )
    const otherRag = buildSecurePrompt(
      PROFILE_WITH_EXAMPLES,
      null,
      "",
      "",
      undefined,
      "kapan fitting",
      "=== INFORMASI RELEVAN ===\nchunk B",
    )
    const prefix = withRag.slice(0, withRag.indexOf("=== INFORMASI RELEVAN ==="))
    expect(prefix.length).toBeGreaterThan(0)
    expect(otherRag.startsWith(prefix)).toBe(true)
    expect(withRag.indexOf("=== INFORMASI RELEVAN ===")).toBeGreaterThan(
      withRag.indexOf("=== PENGETAHUAN BISNIS ==="),
    )
  })

  it("falls back to static business context when ragContext is empty string", () => {
    const prompt = buildSecurePrompt(
      PROFILE_WITH_STRUCTURED,
      null,
      "",
      "",
      undefined,
      "berapa harga",
      "", // empty ragContext = no RAG hit
    )
    expect(prompt).toContain("=== PENGETAHUAN BISNIS ===")
  })

  it("falls back to static business context when ragContext is undefined", () => {
    const prompt = buildSecurePrompt(
      PROFILE_WITH_STRUCTURED,
      null,
      "",
      "",
      undefined,
      "berapa harga",
      // ragContext not passed
    )
    expect(prompt).toContain("=== PENGETAHUAN BISNIS ===")
  })

  it("always includes Level 1 rules regardless of RAG", () => {
    const ragContext = "some rag chunk"
    const prompt = buildSecurePrompt(
      PROFILE_WITH_STRUCTURED,
      null,
      "",
      "",
      undefined,
      "test message",
      ragContext,
    )
    // Level 1 rules start with the assistant identity
    expect(prompt).toContain("asisten admin WhatsApp")
  })

  it("includes business name and brand voice in RAG path", () => {
    const ragContext = "some rag chunk"
    const prompt = buildSecurePrompt(
      PROFILE_WITH_STRUCTURED,
      null,
      "",
      "",
      undefined,
      "test",
      ragContext,
    )
    expect(prompt).toContain("Butik Cantik")
    expect(prompt).toContain("Sapa dengan 'Kak'")
  })

  it("skips static conversation examples when RAG is active", () => {
    const ragContext = "=== INFORMASI RELEVAN ===\nrelevant chunk"
    const prompt = buildSecurePrompt(
      PROFILE_WITH_EXAMPLES,
      null,
      "",
      "",
      undefined,
      "berapa harga",
      ragContext,
    )
    // Static examples section header should NOT appear when RAG is active
    expect(prompt).not.toContain("=== CONTOH BALASAN NYATA BISNIS INI ===")
  })
})

// ── hashChunk() + diffChunks() — diff-based reindex ──────────────────────────

function hashed(profile: Profile): HashedChunk[] {
  return chunkProfile(profile).map((c) => ({
    ...c,
    content_hash: hashChunk(c.chunk_type, c.chunk_text),
  }))
}

function fakeExisting(chunks: HashedChunk[]): Array<{ id: string; content_hash: string }> {
  return chunks.map((c, i) => ({ id: `row-${i}`, content_hash: c.content_hash }))
}

describe("hashChunk()", () => {
  it("is deterministic and produces a 64-char hex digest", () => {
    const a = hashChunk("service", "Layanan: Kebaya")
    const b = hashChunk("service", "Layanan: Kebaya")
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it("changes when chunk_type or text changes", () => {
    const base = hashChunk("service", "text")
    expect(hashChunk("meta", "text")).not.toBe(base)
    expect(hashChunk("service", "text2")).not.toBe(base)
  })
})

describe("diffChunks()", () => {
  it("unchanged profile → 0 insert, 0 delete, all reused", () => {
    const desired = hashed(PROFILE_WITH_EXAMPLES)
    const diff = diffChunks(fakeExisting(desired), desired)
    expect(diff.toInsert).toHaveLength(0)
    expect(diff.toDeleteIds).toHaveLength(0)
    expect(diff.reused).toBe(desired.length)
  })

  it("one example corrected → exactly 1 insert", () => {
    const examples = PROFILE_WITH_EXAMPLES.conversation_examples ?? []
    const before = hashed(PROFILE_WITH_EXAMPLES)
    const after = hashed({
      ...PROFILE_WITH_EXAMPLES,
      conversation_examples: [
        { ...examples[0], admin: "Harga kebaya mulai 900rb Kak 😊" },
        examples[1],
      ],
    })
    const diff = diffChunks(fakeExisting(before), after)
    expect(diff.toInsert).toHaveLength(1)
    expect(diff.toInsert[0].chunk_text).toContain("900rb")
    expect(diff.toDeleteIds).toHaveLength(1) // old answer
    expect(diff.reused).toBe(after.length - 1)
  })

  it("example removed → its row deleted, no insert", () => {
    const examples = PROFILE_WITH_EXAMPLES.conversation_examples ?? []
    const before = hashed(PROFILE_WITH_EXAMPLES)
    const after = hashed({ ...PROFILE_WITH_EXAMPLES, conversation_examples: [examples[0]] })
    const diff = diffChunks(fakeExisting(before), after)
    expect(diff.toInsert).toHaveLength(0)
    expect(diff.toDeleteIds).toHaveLength(1)
    expect(diff.reused).toBe(after.length)
  })

  it("legacy service/meta rows are deleted once structured knowledge is no longer chunked", () => {
    const legacy = [
      { id: "svc-1", content_hash: hashChunk("service", "Layanan: Kebaya Modern") },
      { id: "meta-1", content_hash: hashChunk("meta", "Jam operasional: 09.00") },
    ]
    const desired = hashed(PROFILE_WITH_EXAMPLES)
    const diff = diffChunks(legacy, desired)
    expect(diff.toDeleteIds.sort()).toEqual(["meta-1", "svc-1"])
    expect(diff.toInsert).toHaveLength(desired.length)
  })

  it("empty desired → all existing rows deleted", () => {
    const before = hashed(PROFILE_WITH_EXAMPLES)
    const diff = diffChunks(fakeExisting(before), [])
    expect(diff.toInsert).toHaveLength(0)
    expect(diff.toDeleteIds).toHaveLength(before.length)
    expect(diff.reused).toBe(0)
  })

  it("duplicate identical chunks match as a multiset, not a set", () => {
    // Two identical desired chunks, one existing row → 1 reused + 1 insert
    const chunk: HashedChunk = {
      chunk_type: "example",
      chunk_text: 'Pertanyaan pelanggan: "x"\nJawaban admin: "y"',
      metadata: {},
      content_hash: "",
    }
    chunk.content_hash = hashChunk(chunk.chunk_type, chunk.chunk_text)
    const diff = diffChunks([{ id: "row-0", content_hash: chunk.content_hash }], [chunk, chunk])
    expect(diff.reused).toBe(1)
    expect(diff.toInsert).toHaveLength(1)
    expect(diff.toDeleteIds).toHaveLength(0)
  })

  it("rows with null content_hash (legacy) are deleted, not matched", () => {
    const desired = hashed(PROFILE_WITH_EXAMPLES)
    const existing = [{ id: "legacy-1", content_hash: null }]
    const diff = diffChunks(existing, desired)
    expect(diff.reused).toBe(0)
    expect(diff.toInsert).toHaveLength(desired.length)
    expect(diff.toDeleteIds).toEqual(["legacy-1"])
  })
})

// ── embedTexts() — batched embedding ─────────────────────────────────────────

describe("embedTexts()", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("sends one request and maps results back by index, skipping empty inputs", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          // returned out of order on purpose — must be mapped via `index`
          data: [
            { index: 1, embedding: [2] },
            { index: 0, embedding: [1] },
          ],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await embedTexts(["a", "   ", "c"])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.input).toEqual(["a", "c"])
    expect(result).toEqual([[1], null, [2]])
  })

  it("returns all nulls when the request fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })))

    expect(await embedTexts(["a", "b"])).toEqual([null, null])
  })
})

// ── shouldReindexNow() — correction reindex throttle ─────────────────────────

describe("shouldReindexNow()", () => {
  const NOW = 1_700_000_000_000

  it("reindexes immediately when never indexed", () => {
    expect(shouldReindexNow(null, NOW)).toBe(true)
    expect(shouldReindexNow(undefined, NOW)).toBe(true)
  })

  it("reindexes when last index is older than the throttle window", () => {
    const old = new Date(NOW - REINDEX_THROTTLE_MS - 1000).toISOString()
    expect(shouldReindexNow(old, NOW)).toBe(true)
  })

  it("defers (dirty flag) when last index is within the throttle window", () => {
    const recent = new Date(NOW - REINDEX_THROTTLE_MS + 1000).toISOString()
    expect(shouldReindexNow(recent, NOW)).toBe(false)
  })

  it("two corrections <60s apart: first reindexes, second defers", () => {
    const first = shouldReindexNow(null, NOW)
    expect(first).toBe(true)
    // after first reindex, last_indexed_at = NOW
    const second = shouldReindexNow(new Date(NOW).toISOString(), NOW + 30_000)
    expect(second).toBe(false)
  })
})
