import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  AI_RATE_LIMIT_CONFIG,
  checkAIRateLimit,
  createAIRateLimitResponse,
  estimateTokens,
  getClientIp,
  recordAIUsage,
  resetAIRateLimit,
} from "@/lib/rate-limit"

describe("AI Endpoint Rate Limiter & Token Cap", () => {
  const testUserId = "user-123-test"
  const testIp = "192.168.1.50"

  beforeEach(() => {
    resetAIRateLimit()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetAIRateLimit()
  })

  it("should estimate tokens based on text length", () => {
    expect(estimateTokens("")).toBe(0)
    expect(estimateTokens("abcd")).toBe(1)
    expect(estimateTokens("Halo Kak, apakah produk ini masih ada?")).toBeGreaterThan(5)
  })

  it("should extract client IP correctly from headers", () => {
    const headers1 = new Headers({ "cf-connecting-ip": "1.1.1.1" })
    expect(getClientIp(headers1)).toBe("1.1.1.1")

    const headers2 = new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" })
    expect(getClientIp(headers2)).toBe("2.2.2.2")

    const headers3 = new Headers({})
    expect(getClientIp(headers3)).toBe("127.0.0.1")
  })

  it("should allow initial requests within hourly and daily limits", async () => {
    const status = await checkAIRateLimit(testUserId, testIp, 500)
    expect(status.allowed).toBe(true)
    expect(status.remainingHourly).toBe(AI_RATE_LIMIT_CONFIG.MAX_HOURLY_REQUESTS)
    expect(status.remainingDaily).toBe(AI_RATE_LIMIT_CONFIG.MAX_DAILY_REQUESTS)
    expect(status.retryAfterSeconds).toBe(0)
  })

  it("limit hit -> should reject with 429 when max 30 requests/hour is exceeded", async () => {
    // Record 30 requests
    for (let i = 0; i < AI_RATE_LIMIT_CONFIG.MAX_HOURLY_REQUESTS; i++) {
      await recordAIUsage(testUserId, 100, testIp)
    }

    // 31st request should be blocked
    const status = await checkAIRateLimit(testUserId, testIp, 100)
    expect(status.allowed).toBe(false)
    expect(status.remainingHourly).toBe(0)
    expect(status.retryAfterSeconds).toBeGreaterThan(0)
    expect(status.reason).toContain("Batas permintaan AI per jam tercapai")

    // Verify 429 response structure and Retry-After header
    const response = createAIRateLimitResponse(status.retryAfterSeconds, status.reason)
    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe(String(status.retryAfterSeconds))

    const body = await response.json()
    expect(body.error).toContain("Batas permintaan AI per jam tercapai")
    expect(body.retryAfter).toBe(status.retryAfterSeconds)
  })

  it("reset after window -> should allow requests again after hourly window expires", async () => {
    vi.useFakeTimers()
    const baseTime = new Date("2026-08-20T10:00:00Z").getTime()
    vi.setSystemTime(baseTime)

    // Record 30 requests at 10:00
    for (let i = 0; i < AI_RATE_LIMIT_CONFIG.MAX_HOURLY_REQUESTS; i++) {
      await recordAIUsage(testUserId, 100, testIp)
    }

    // Blocked at 10:00
    let status = await checkAIRateLimit(testUserId, testIp, 100)
    expect(status.allowed).toBe(false)

    // Advance time by 61 minutes (past 1 hour window)
    vi.advanceTimersByTime(61 * 60 * 1000)

    // Now request should be allowed again
    status = await checkAIRateLimit(testUserId, testIp, 100)
    expect(status.allowed).toBe(true)
    expect(status.remainingHourly).toBe(AI_RATE_LIMIT_CONFIG.MAX_HOURLY_REQUESTS)
    expect(status.retryAfterSeconds).toBe(0)
  })

  it("daily token cap -> should block requests when daily token usage exceeds 100k tokens", async () => {
    // Record usage reaching 100,001 tokens
    await recordAIUsage(testUserId, 100_001, testIp)

    const status = await checkAIRateLimit(testUserId, testIp, 500)
    expect(status.allowed).toBe(false)
    expect(status.remainingTokens).toBe(0)
    expect(status.retryAfterSeconds).toBeGreaterThan(0)
    expect(status.reason).toContain("Batas token AI harian tercapai")

    const response = createAIRateLimitResponse(status.retryAfterSeconds, status.reason)
    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBeDefined()
  })
})
