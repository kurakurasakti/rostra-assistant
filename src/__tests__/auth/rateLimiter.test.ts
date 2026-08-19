import { beforeEach, describe, expect, it } from "vitest"
import {
  checkLoginRateLimit,
  getClientIp,
  LOGIN_SECURITY_CONFIG,
  normalizeEmail,
  recordFailedLoginAttempt,
  resetLoginRateLimit,
} from "@/lib/auth/rate-limiter"

describe("Anti-Bruteforce Login Rate Limiter", () => {
  const testEmail = "victim@example.com"
  const testIp = "192.168.1.100"

  beforeEach(async () => {
    await resetLoginRateLimit(testEmail, testIp)
  })

  it("should normalize emails properly", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com")
  })

  it("should extract client IP correctly from various headers", () => {
    const headers1 = new Headers({ "cf-connecting-ip": "1.1.1.1" })
    expect(getClientIp(headers1)).toBe("1.1.1.1")

    const headers2 = new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" })
    expect(getClientIp(headers2)).toBe("2.2.2.2")

    const headers3 = new Headers({ "x-real-ip": "4.4.4.4" })
    expect(getClientIp(headers3)).toBe("4.4.4.4")

    const headers4 = new Headers({})
    expect(getClientIp(headers4)).toBe("127.0.0.1")
  })

  it("should allow initial attempts and decrement remaining attempts", async () => {
    let status = checkLoginRateLimit(testEmail, testIp)
    expect(status.allowed).toBe(true)
    expect(status.remainingAttempts).toBe(5)
    expect(status.isLocked).toBe(false)

    // 1st failed attempt
    let result = await recordFailedLoginAttempt(testEmail, testIp)
    expect(result.remainingAttempts).toBe(4)
    expect(result.isLocked).toBe(false)

    // 2nd failed attempt
    result = await recordFailedLoginAttempt(testEmail, testIp)
    expect(result.remainingAttempts).toBe(3)
    expect(result.isLocked).toBe(false)

    // 3rd failed attempt — warning threshold reached
    result = await recordFailedLoginAttempt(testEmail, testIp)
    expect(result.remainingAttempts).toBe(2)
    status = checkLoginRateLimit(testEmail, testIp)
    expect(status.warning).toBeDefined()
  })

  it("should lock out user after reaching MAX_ATTEMPTS (5 failed attempts)", async () => {
    for (let i = 1; i <= 4; i++) {
      await recordFailedLoginAttempt(testEmail, testIp)
    }

    // 5th failed attempt should trigger standard lockout
    const result = await recordFailedLoginAttempt(testEmail, testIp)
    expect(result.isLocked).toBe(true)
    expect(result.remainingAttempts).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(800) // ~15 mins

    // Subsequent check should reject
    const status = checkLoginRateLimit(testEmail, testIp)
    expect(status.allowed).toBe(false)
    expect(status.isLocked).toBe(true)
    expect(status.reason).toContain("dikunci sementara")
  })

  it("should reset rate limit counters when resetLoginRateLimit is called", async () => {
    await recordFailedLoginAttempt(testEmail, testIp)
    await recordFailedLoginAttempt(testEmail, testIp)

    let status = checkLoginRateLimit(testEmail, testIp)
    expect(status.remainingAttempts).toBe(3)

    // Successful login reset
    await resetLoginRateLimit(testEmail, testIp)

    status = checkLoginRateLimit(testEmail, testIp)
    expect(status.remainingAttempts).toBe(5)
    expect(status.isLocked).toBe(false)
  })
})
