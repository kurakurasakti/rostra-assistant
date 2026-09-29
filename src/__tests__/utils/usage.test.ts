/**
 * src/__tests__/utils/usage.test.ts
 *
 * Unit tests for the metering module (lib/usage.ts).
 * Pure functions only — no DB needed. DB-backed paths (trackUsage,
 * checkQuota, RPC) fail open by design and are verified manually/e2e.
 */

import { describe, expect, it } from "vitest"
import { currentMonthKey, evaluateQuota, resolvePlan, todayKey } from "@/lib/usage"

describe("resolvePlan()", () => {
  it("returns free when there is no subscription row", () => {
    expect(resolvePlan(null)).toBe("free")
    expect(resolvePlan(undefined)).toBe("free")
  })

  it("returns pro for active or trialing subscriptions", () => {
    expect(resolvePlan({ status: "active", plan_id: "glim_pro_monthly" })).toBe("pro")
    expect(resolvePlan({ status: "trialing", plan_id: "glim_pro_monthly" })).toBe("pro")
  })

  it("returns free for lapsed subscriptions", () => {
    for (const status of ["past_due", "canceled", "expired"]) {
      expect(resolvePlan({ status, plan_id: "glim_pro_monthly" })).toBe("free")
    }
  })
})

describe("evaluateQuota()", () => {
  it("allows usage below the limit", () => {
    const r = evaluateQuota(0, "free")
    expect(r.allowed).toBe(true)
    expect(r.usagePct).toBe(0)
  })

  it("allows 79% without flagging", () => {
    const r = evaluateQuota(237, "free") // 237/300 = 79%
    expect(r.allowed).toBe(true)
    expect(r.usagePct).toBeLessThan(0.8)
  })

  it("denies exactly at 100%", () => {
    const r = evaluateQuota(300, "free")
    expect(r.allowed).toBe(false)
    expect(r.usagePct).toBe(1)
  })

  it("denies above the limit", () => {
    const r = evaluateQuota(450, "free")
    expect(r.allowed).toBe(false)
    expect(r.usagePct).toBeGreaterThan(1)
  })

  it("uses the pro limit for pro plan", () => {
    expect(evaluateQuota(2999, "pro").allowed).toBe(true)
    expect(evaluateQuota(3000, "pro").allowed).toBe(false)
  })
})

describe("currentMonthKey()", () => {
  it("returns the first day of the month as YYYY-MM-DD", () => {
    expect(currentMonthKey(new Date(2026, 8, 29))).toBe("2026-09-01")
    expect(currentMonthKey(new Date(2026, 0, 15))).toBe("2026-01-01")
  })
})

describe("todayKey()", () => {
  it("returns today as YYYY-MM-DD", () => {
    expect(todayKey(new Date(2026, 8, 29))).toBe("2026-09-29")
  })
})
