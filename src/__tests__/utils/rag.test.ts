/**
 * src/__tests__/utils/rag.test.ts
 *
 * Unit tests for the RAG module (lib/rag.ts) and its integration with
 * buildSecurePrompt (lib/openrouter.ts).
 *
 * These tests run fully offline — no DB or embedding API needed.
 * They test: chunking logic, prompt assembly, and fallback behaviour.
 */

import { describe, expect, it } from "vitest"
import { chunkProfile } from "@/lib/rag"
import { buildSecurePrompt } from "@/lib/openrouter"
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
  it("produces one service chunk per service", () => {
    const chunks = chunkProfile(PROFILE_WITH_STRUCTURED)
    const serviceChunks = chunks.filter((c) => c.chunk_type === "service")
    expect(serviceChunks).toHaveLength(2)
  })

  it("service chunk contains name and price", () => {
    const chunks = chunkProfile(PROFILE_WITH_STRUCTURED)
    const kebaya = chunks.find((c) => c.chunk_text.includes("Kebaya Modern"))
    expect(kebaya).toBeDefined()
    expect(kebaya!.chunk_text).toContain("750rb–2jt")
    expect(kebaya!.chunk_text).toContain("Bahan premium")
    expect(kebaya!.metadata.category).toBe("harga")
  })

  it("service chunk without description omits the description line", () => {
    const chunks = chunkProfile(PROFILE_WITH_STRUCTURED)
    const gaun = chunks.find((c) => c.chunk_text.includes("Gaun Pesta"))
    expect(gaun).toBeDefined()
    expect(gaun!.chunk_text).not.toContain("Keterangan:")
  })

  it("produces exactly one meta chunk", () => {
    const chunks = chunkProfile(PROFILE_WITH_STRUCTURED)
    const metaChunks = chunks.filter((c) => c.chunk_type === "meta")
    expect(metaChunks).toHaveLength(1)
  })

  it("meta chunk includes hours, location, payment, and PO status", () => {
    const chunks = chunkProfile(PROFILE_WITH_STRUCTURED)
    const meta = chunks.find((c) => c.chunk_type === "meta")!
    expect(meta.chunk_text).toContain("Senin–Sabtu 09.00–17.00")
    expect(meta.chunk_text).toContain("Jakarta")
    expect(meta.chunk_text).toContain("BCA")
    expect(meta.chunk_text).toContain("Open PO: Buka sampai 2026-10-31")
    expect(meta.chunk_text).toContain("Minimal DP 50%")
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

  it("does NOT include static buildBusinessContext when ragContext is provided", () => {
    // The static block starts with '=== PENGETAHUAN BISNIS ==='
    const ragContext = "=== INFORMASI RELEVAN ===\nsome chunk"
    const prompt = buildSecurePrompt(
      PROFILE_WITH_STRUCTURED,
      null,
      "",
      "",
      undefined,
      "berapa harga",
      ragContext,
    )
    expect(prompt).not.toContain("=== PENGETAHUAN BISNIS ===")
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
