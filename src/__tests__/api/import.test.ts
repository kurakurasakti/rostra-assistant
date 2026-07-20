import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { normalizeWANumber } from "../../../lib/whatsapp"

describe("normalizeWANumber", () => {
  beforeAll(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe("standard Indonesian formats", () => {
    it('converts "08xx" to "628xx"', () => {
      expect(normalizeWANumber("081234567890")).toBe("6281234567890")
    })

    it('converts "+628xx" to "628xx"', () => {
      expect(normalizeWANumber("+6281234567890")).toBe("6281234567890")
    })

    it("passes through already-normalized 62-prefix numbers", () => {
      expect(normalizeWANumber("6281234567890")).toBe("6281234567890")
    })

    it('converts "8xx" (no leading 0) to "628xx"', () => {
      expect(normalizeWANumber("81234567890")).toBe("6281234567890")
    })
  })

  describe("formatting variations", () => {
    it("strips dashes", () => {
      expect(normalizeWANumber("0812-3456-7890")).toBe("6281234567890")
    })

    it("strips spaces", () => {
      expect(normalizeWANumber("0812 3456 7890")).toBe("6281234567890")
    })

    it("trims surrounding whitespace", () => {
      expect(normalizeWANumber(" 081234567890 ")).toBe("6281234567890")
    })

    it("strips dots", () => {
      expect(normalizeWANumber("0812.3456.7890")).toBe("6281234567890")
    })

    it("strips mixed separators", () => {
      expect(normalizeWANumber("+62 812-3456.7890")).toBe("6281234567890")
    })
  })

  describe("international prefixes", () => {
    it('handles "0062" prefix', () => {
      expect(normalizeWANumber("006281234567890")).toBe("6281234567890")
    })

    it('handles "01162" prefix (US/Canada)', () => {
      expect(normalizeWANumber("0116281234567890")).toBe("6281234567890")
    })

    it("rejects 00-prefixed numbers that are not Indonesian", () => {
      expect(normalizeWANumber("00121234567890")).toBeNull()
    })

    it("rejects 011-prefixed numbers that are not Indonesian", () => {
      expect(normalizeWANumber("011441234567890")).toBeNull()
    })
  })

  describe("scientific notation (Excel)", () => {
    it("converts full-precision scientific notation", () => {
      expect(normalizeWANumber("6.2812345678E+10")).toBe("62812345678")
    })

    it("rejects truncated scientific notation (4+ trailing zeros)", () => {
      expect(normalizeWANumber("8.12E+09")).toBeNull()
    })

    it("handles lowercase e", () => {
      expect(normalizeWANumber("6.2812345678e+10")).toBe("62812345678")
    })

    it("handles scientific notation without + sign", () => {
      expect(normalizeWANumber("6.2812345678E10")).toBe("62812345678")
    })
  })

  describe("Baileys JID formats", () => {
    it('strips "@s.whatsapp.net" suffix', () => {
      expect(normalizeWANumber("6281234567890@s.whatsapp.net")).toBe("6281234567890")
    })

    it("preserves @lid format", () => {
      expect(normalizeWANumber("12345@lid")).toBe("12345@lid")
    })

    it("rejects @lid with empty numeric part", () => {
      expect(normalizeWANumber("@lid")).toBeNull()
    })
  })

  describe("length validation", () => {
    it("rejects numbers shorter than 10 digits after 62 prefix", () => {
      expect(normalizeWANumber("081")).toBeNull()
    })

    it("rejects numbers longer than 15 digits after 62 prefix", () => {
      expect(normalizeWANumber("6281234567890123456")).toBeNull()
    })

    it("accepts 10-digit number starting with 62", () => {
      expect(normalizeWANumber("6281234567")).toBe("6281234567")
    })

    it("accepts 15-digit number starting with 62", () => {
      expect(normalizeWANumber("628123456789012")).toBe("628123456789012")
    })

    it("rejects 9-digit number starting with 62", () => {
      expect(normalizeWANumber("628123456")).toBeNull()
    })

    it("rejects 16-digit number starting with 62", () => {
      expect(normalizeWANumber("6281234567890123")).toBeNull()
    })
  })

  describe("rejection cases", () => {
    it("rejects empty string", () => {
      expect(normalizeWANumber("")).toBeNull()
    })

    it("rejects null", () => {
      expect(normalizeWANumber(null as unknown as string)).toBeNull()
    })

    it("rejects undefined", () => {
      expect(normalizeWANumber(undefined as unknown as string)).toBeNull()
    })

    it("rejects non-digit strings", () => {
      expect(normalizeWANumber("abc")).toBeNull()
    })

    it("rejects non-Indonesian country codes", () => {
      expect(normalizeWANumber("+12025551234")).toBeNull()
    })

    it("rejects numbers starting with 1", () => {
      expect(normalizeWANumber("1234567890")).toBeNull()
    })

    it("rejects numbers starting with 7", () => {
      expect(normalizeWANumber("71234567890")).toBeNull()
    })
  })

  describe("edge cases around prefix conversion length", () => {
    it("rejects 8-prefix number that fails min length after conversion", () => {
      expect(normalizeWANumber("8123456")).toBeNull() // 7 digits → 628123456 = 9 digits → fails
    })

    it("converts 8-prefix 10-digit number to 12-digit format", () => {
      expect(normalizeWANumber("8123456789")).toBe("628123456789")
    })

    it("converts 0-prefix 10-digit number to 11-digit format", () => {
      expect(normalizeWANumber("0812345678")).toBe("62812345678")
    })
  })
})
