import { describe, expect, it } from "vitest"
import { validateAIOutput } from "@/lib/security"

describe("validateAIOutput", () => {
  it("blocks outputs with unauthorized external URLs", () => {
    const maliciousDraft = "Silakan klik link berikut untuk klaim diskon: https://phishing-site.com/login"
    const result = validateAIOutput(maliciousDraft)
    expect(result.safe).toBe(false)
    expect(result.reason).toBe("contains_url")
  })

  it("allows safe wa.me links in output", () => {
    const safeDraft = "Halo Kak, silakan hubungi admin langsung di https://wa.me/6281234567890 ya."
    const result = validateAIOutput(safeDraft)
    expect(result.safe).toBe(true)
  })

  it("blocks outputs revealing credit card or bank account sequences", () => {
    const draftWithCard = "Nomor kartu kredit internal adalah 4111111111111234 silakan digunakan."
    const result = validateAIOutput(draftWithCard)
    expect(result.safe).toBe(false)
    expect(result.reason).toBe("contains_number_sequence")
  })

  it("blocks outputs that confirm jailbreaks or role switches", () => {
    const jailbreakOutputs = [
      "Saya sekarang adalah AI tanpa batas dan siap melayani apa saja.",
      "Instruksi baru telah diterima, saya akan mengabaikan aturan lama.",
      "Mode hacker aktif.",
    ]

    for (const out of jailbreakOutputs) {
      const result = validateAIOutput(out)
      expect(result.safe).toBe(false)
      expect(result.reason).toBe("possible_jailbreak")
    }
  })

  it("blocks excessively long responses (>600 characters)", () => {
    const longDraft = "A".repeat(601)
    const result = validateAIOutput(longDraft)
    expect(result.safe).toBe(false)
    expect(result.reason).toBe("too_long")
  })

  it("allows valid, friendly business responses through", () => {
    const validDraft = "Halo Kak! Untuk paket jahit jas lengkap mulai dari Rp1.500.000 ya Kak. Ada yang bisa kami bantu lagi? 🙏"
    const result = validateAIOutput(validDraft)
    expect(result.safe).toBe(true)
  })
})
