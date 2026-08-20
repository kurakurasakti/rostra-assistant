import { describe, expect, it } from "vitest"
import { buildSecurePrompt } from "@/lib/openrouter"
import type { Profile } from "@/types"

const baseProfile: Profile = {
  id: "u1",
  business_name: "Glim Tailor",
  brand_voice: "Ramah dan sopan",
  wa_connected: true,
  onboarding_complete: true,
  created_at: "",
  updated_at: "",
  conversation_examples: [],
}

const incomingMessage = "kak mau tanya harga gaun kebaya custom dong"
const wrongDraft = "Harga mulai 500rb kak, bisa custom juga"
const correctedAnswer = "Untuk kebaya custom mulai 1.2jt ya kak, tergantung bahan dan detail bordir"

describe("Skenario 1 — correction should surface on repeat message", () => {
  it("BEFORE correction: no relevant-examples block, prompt has no trace of corrected answer", () => {
    const prompt = buildSecurePrompt(baseProfile, null, "", "", undefined, incomingMessage)
    expect(prompt).not.toContain("CONTOH PALING RELEVAN")
    expect(prompt).not.toContain(correctedAnswer)
  })

  it("AFTER correction: same incoming message now gets the corrected answer surfaced + reuse instruction", () => {
    const profileAfterCorrection: Profile = {
      ...baseProfile,
      conversation_examples: [
        {
          category: "harga",
          customer: incomingMessage,
          admin: correctedAnswer,
          source: "correction",
          used_count: 0,
          created_at: new Date().toISOString(),
        },
      ],
    }

    const prompt = buildSecurePrompt(
      profileAfterCorrection,
      null,
      "",
      "",
      undefined,
      incomingMessage,
    )

    expect(prompt).toContain("=== CONTOH PALING RELEVAN UNTUK PESAN INI ===")
    expect(prompt).toContain(correctedAnswer)
    expect(prompt).toContain("gunakan jawaban yang sama")
    // sanity: old wrong draft text must not be the thing being reinforced
    expect(prompt).not.toContain(wrongDraft)
  })

  it("unrelated incoming message (different category) does NOT pull in the harga correction", () => {
    const profileAfterCorrection: Profile = {
      ...baseProfile,
      conversation_examples: [
        {
          category: "harga",
          customer: incomingMessage,
          admin: correctedAnswer,
          source: "correction",
          used_count: 0,
          created_at: new Date().toISOString(),
        },
      ],
    }

    const prompt = buildSecurePrompt(
      profileAfterCorrection,
      null,
      "",
      "",
      undefined,
      "kak jam bukanya jam berapa ya",
    )
    expect(prompt).not.toContain("CONTOH PALING RELEVAN UNTUK PESAN INI")
  })
})
