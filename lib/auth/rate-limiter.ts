import { createServiceClient } from "@/lib/supabase/server"

interface RateLimitRecord {
  count: number
  firstAttemptAt: number
  lastAttemptAt: number
  lockedUntil: number | null
}

export interface RateLimitStatus {
  allowed: boolean
  remainingAttempts: number
  retryAfterSeconds: number
  isLocked: boolean
  warning?: string
  reason?: string
}

// In-memory memory store (fastest)
const memoryStore = new Map<string, RateLimitRecord>()

// Configuration Constants
export const LOGIN_SECURITY_CONFIG = {
  MAX_ATTEMPTS: 5, // 5 failed attempts before lockout
  WARNING_THRESHOLD: 3, // Show warning after 3 failed attempts
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes lockout
  EXTENDED_LOCKOUT_DURATION_MS: 60 * 60 * 1000, // 60 minutes for repeated offenders (>= 10 attempts)
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes sliding window
}

/**
 * Extract real client IP from incoming request headers
 */
export function getClientIp(headers: Headers): string {
  const cfConnectingIp = headers.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp.trim()

  const xForwardedFor = headers.get("x-forwarded-for")
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim()
  }

  const xRealIp = headers.get("x-real-ip")
  if (xRealIp) return xRealIp.trim()

  return "127.0.0.1"
}

/**
 * Normalize email to avoid casing/whitespace bypasses
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Check if the email or IP is currently locked out
 */
export function checkLoginRateLimit(email: string, ip: string): RateLimitStatus {
  const now = Date.now()
  const normEmail = normalizeEmail(email)

  const emailKey = `email:${normEmail}`
  const ipKey = `ip:${ip}`

  const emailRecord = memoryStore.get(emailKey)
  const ipRecord = memoryStore.get(ipKey)

  // Check email lockout
  if (emailRecord?.lockedUntil && emailRecord.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((emailRecord.lockedUntil - now) / 1000)
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      isLocked: true,
      reason: `Akun ini dikunci sementara karena terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${formatRetryTime(retryAfterSeconds)}.`,
    }
  }

  // Check IP lockout
  if (ipRecord?.lockedUntil && ipRecord.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((ipRecord.lockedUntil - now) / 1000)
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      isLocked: true,
      reason: `Perangkat/IP ini dikunci sementara karena terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${formatRetryTime(retryAfterSeconds)}.`,
    }
  }

  // Check sliding window expiry for email
  let emailAttempts = 0
  if (emailRecord) {
    if (now - emailRecord.firstAttemptAt > LOGIN_SECURITY_CONFIG.WINDOW_MS) {
      // Window expired, reset
      memoryStore.delete(emailKey)
    } else {
      emailAttempts = emailRecord.count
    }
  }

  // Check sliding window expiry for IP
  let ipAttempts = 0
  if (ipRecord) {
    if (now - ipRecord.firstAttemptAt > LOGIN_SECURITY_CONFIG.WINDOW_MS) {
      memoryStore.delete(ipKey)
    } else {
      ipAttempts = ipRecord.count
    }
  }

  const maxCurrentAttempts = Math.max(emailAttempts, ipAttempts)
  const remaining = Math.max(0, LOGIN_SECURITY_CONFIG.MAX_ATTEMPTS - maxCurrentAttempts)

  let warning: string | undefined
  if (maxCurrentAttempts >= LOGIN_SECURITY_CONFIG.WARNING_THRESHOLD && remaining > 0) {
    warning = `Peringatan keamanan: Sisa ${remaining} kesempatan sebelum login dikunci sementara.`
  }

  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
    isLocked: false,
    warning,
  }
}

/**
 * Record a failed login attempt and apply lockouts if threshold reached
 */
export async function recordFailedLoginAttempt(
  email: string,
  ip: string,
  userAgent?: string,
): Promise<{ remainingAttempts: number; isLocked: boolean; retryAfterSeconds: number; reason?: string }> {
  const now = Date.now()
  const normEmail = normalizeEmail(email)

  const keys = [`email:${normEmail}`, `ip:${ip}`]
  let currentCount = 0
  let isLocked = false
  let retryAfterSeconds = 0

  for (const key of keys) {
    const existing = memoryStore.get(key)
    if (!existing || now - existing.firstAttemptAt > LOGIN_SECURITY_CONFIG.WINDOW_MS) {
      memoryStore.set(key, {
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        lockedUntil: null,
      })
      currentCount = Math.max(currentCount, 1)
    } else {
      const newCount = existing.count + 1
      currentCount = Math.max(currentCount, newCount)

      let lockedUntil: number | null = null
      if (newCount >= 10) {
        // Extended lockout (1 hour)
        lockedUntil = now + LOGIN_SECURITY_CONFIG.EXTENDED_LOCKOUT_DURATION_MS
        isLocked = true
        retryAfterSeconds = Math.ceil(LOGIN_SECURITY_CONFIG.EXTENDED_LOCKOUT_DURATION_MS / 1000)
      } else if (newCount >= LOGIN_SECURITY_CONFIG.MAX_ATTEMPTS) {
        // Standard lockout (15 minutes)
        lockedUntil = now + LOGIN_SECURITY_CONFIG.LOCKOUT_DURATION_MS
        isLocked = true
        retryAfterSeconds = Math.ceil(LOGIN_SECURITY_CONFIG.LOCKOUT_DURATION_MS / 1000)
      }

      memoryStore.set(key, {
        count: newCount,
        firstAttemptAt: existing.firstAttemptAt,
        lastAttemptAt: now,
        lockedUntil,
      })
    }
  }

  const remainingAttempts = Math.max(0, LOGIN_SECURITY_CONFIG.MAX_ATTEMPTS - currentCount)

  // Asynchronously log to database security_logs
  logSecurityEvent({
    eventType: isLocked ? "login_lockout" : "login_failed",
    ipAddress: ip,
    email: normEmail,
    userAgent,
    details: {
      attemptCount: currentCount,
      remainingAttempts,
      isLocked,
      retryAfterSeconds,
    },
  }).catch((err) => console.error("[SecurityLog] DB log error:", err))

  let reason: string | undefined
  if (isLocked) {
    reason = `Terlalu banyak percobaan login gagal. Akses dikunci sementara selama ${formatRetryTime(retryAfterSeconds)}.`
  }

  return {
    remainingAttempts,
    isLocked,
    retryAfterSeconds,
    reason,
  }
}

/**
 * Reset rate limit counters upon successful login
 */
export async function resetLoginRateLimit(email: string, ip: string, userAgent?: string): Promise<void> {
  const normEmail = normalizeEmail(email)
  memoryStore.delete(`email:${normEmail}`)
  memoryStore.delete(`ip:${ip}`)

  // Log successful login
  logSecurityEvent({
    eventType: "login_success",
    ipAddress: ip,
    email: normEmail,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  }).catch((err) => console.error("[SecurityLog] DB log error:", err))
}

/**
 * Format retry duration into friendly Indonesian text
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} detik`
  }
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} menit`
}

/**
 * Write an audit log entry to public.security_logs
 */
export async function logSecurityEvent(params: {
  eventType: string
  ipAddress?: string
  email?: string
  userAgent?: string
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await supabase.from("auth_security_logs").insert({
      event_type: params.eventType,
      ip_address: params.ipAddress,
      email: params.email,
      user_agent: params.userAgent,
      details: params.details || {},
    })
  } catch (err) {
    // Non-blocking catch so database issues do not break the auth flow
    console.error("[logSecurityEvent] Error writing log:", err)
  }
}
