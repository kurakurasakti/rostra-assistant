import { timingSafeEqual } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { getClientIp, logSecurityEvent } from "@/lib/auth/rate-limiter"

// In-memory rate limiting for invite code attempts per IP
const inviteAttemptsStore = new Map<string, { count: number; firstAttemptAt: number; lockedUntil: number | null }>()

const INVITE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000,
  LOCKOUT_MS: 15 * 60 * 1000,
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req.headers)
  const now = Date.now()

  // 1. Check IP lockout
  const record = inviteAttemptsStore.get(clientIp)
  if (record?.lockedUntil && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000)
    return NextResponse.json(
      {
        valid: false,
        error: `Terlalu banyak percobaan kode undangan gagal. Silakan coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    )
  }

  const { code } = await req.json().catch(() => ({}))

  if (!process.env.INVITE_CODE) {
    return NextResponse.json(
      { valid: false, error: "Invite system not configured" },
      { status: 500 },
    )
  }

  const expectedCode = process.env.INVITE_CODE.trim()
  const providedCode = String(code || "").trim()

  // 2. Timing-safe comparison to prevent side-channel timing attacks
  const isMatch =
    providedCode.length > 0 &&
    providedCode.length === expectedCode.length &&
    timingSafeEqual(Buffer.from(providedCode), Buffer.from(expectedCode))

  if (!isMatch) {
    // Record failed attempt
    const existing = inviteAttemptsStore.get(clientIp)
    let newCount = 1
    let lockedUntil: number | null = null

    if (existing && now - existing.firstAttemptAt <= INVITE_LIMIT_CONFIG.WINDOW_MS) {
      newCount = existing.count + 1
      if (newCount >= INVITE_LIMIT_CONFIG.MAX_ATTEMPTS) {
        lockedUntil = now + INVITE_LIMIT_CONFIG.LOCKOUT_MS
        logSecurityEvent({
          eventType: "invite_code_lockout",
          ipAddress: clientIp,
          details: { attemptCount: newCount },
        }).catch(() => {})
      }
      inviteAttemptsStore.set(clientIp, {
        count: newCount,
        firstAttemptAt: existing.firstAttemptAt,
        lockedUntil,
      })
    } else {
      inviteAttemptsStore.set(clientIp, {
        count: 1,
        firstAttemptAt: now,
        lockedUntil: null,
      })
    }

    const remaining = Math.max(0, INVITE_LIMIT_CONFIG.MAX_ATTEMPTS - newCount)
    return NextResponse.json(
      {
        valid: false,
        error: remaining === 0
          ? "Terlalu banyak percobaan gagal. Akses pendaftaran dikunci selama 15 menit."
          : `Kode undangan tidak valid. Sisa ${remaining} kesempatan.`,
      },
      { status: 400 },
    )
  }

  // 3. Success — clear failure counter for IP
  inviteAttemptsStore.delete(clientIp)
  return NextResponse.json({ valid: true })
}
