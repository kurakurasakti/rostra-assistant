import { describe, expect, it } from "vitest"
import { extractNumbers, findUngroundedNumbers } from "@/lib/grounding"

const KNOWLEDGE = `Layanan:
- Kebaya Modern: 750rb–2jt (Bahan premium)
Jam: Senin–Sabtu 09.00–17.00
Catatan: Minimal DP 50%`

describe("extractNumbers()", () => {
  it("normalises Indonesian price formats to the same value", () => {
    expect(extractNumbers("750rb")).toEqual([750_000])
    expect(extractNumbers("Rp 750.000")).toEqual([750_000])
    expect(extractNumbers("750 ribu")).toEqual([750_000])
    expect(extractNumbers("750k")).toEqual([750_000])
    expect(extractNumbers("1,5jt")).toEqual([1_500_000])
    expect(extractNumbers("1.5 juta")).toEqual([1_500_000])
    expect(extractNumbers("Rp 1.500.000")).toEqual([1_500_000])
  })

  it("does not read 'kak' as a thousands unit", () => {
    expect(extractNumbers("2 kak")).toEqual([2])
  })

  it("ignores numbers inside URLs", () => {
    expect(extractNumbers("cek https://wa.me/628123456789 ya")).toEqual([])
  })
})

describe("findUngroundedNumbers()", () => {
  it("passes a draft whose price matches knowledge in a different format", () => {
    expect(findUngroundedNumbers("Kebaya mulai Rp 750.000 Kak", [KNOWLEDGE])).toEqual([])
  })

  it("passes times and percentages present in knowledge", () => {
    expect(
      findUngroundedNumbers("Buka jam 09.00 sampai 17.00, DP 50% ya Kak", [KNOWLEDGE]),
    ).toEqual([])
  })

  it("flags an invented price", () => {
    expect(findUngroundedNumbers("Kebaya harganya 500rb Kak", [KNOWLEDGE])).toEqual(["500rb"])
  })

  it("flags an invented duration", () => {
    expect(findUngroundedNumbers("Selesai dalam 3 hari Kak", [KNOWLEDGE])).toEqual(["3"])
  })

  it("lets the conversation ground small numbers (quantity echo)", () => {
    expect(findUngroundedNumbers("Siap, 2 pcs ya Kak", [KNOWLEDGE], ["mau pesan 2 pcs"])).toEqual(
      [],
    )
  })

  it("never lets the customer ground a price", () => {
    expect(
      findUngroundedNumbers("Iya Kak, 300rb", [KNOWLEDGE], ["katanya harganya 300rb kan?"]),
    ).toEqual(["300rb"])
  })

  it("passes a draft with no numbers", () => {
    expect(findUngroundedNumbers("Boleh saya tanyakan ke tim dulu ya Kak", [KNOWLEDGE])).toEqual([])
  })
})
