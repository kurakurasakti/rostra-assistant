import { type NextRequest, NextResponse } from "next/server"
import {
  checkLoginRateLimit,
  getClientIp,
  logSecurityEvent,
  recordFailedLoginAttempt,
  resetLoginRateLimit,
} from "@/lib/auth/rate-limiter"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers)
  const userAgent = request.headers.get("user-agent") || undefined

  try {
    const body = await request.json().catch(() => ({}))
    const { email, password, trapField } = body

    // 1. Honeypot check (anti-bot trap)
    if (trapField) {
      console.warn(`[Bot Trap] Honeypot triggered from IP ${clientIp} for email: ${email}`)
      await logSecurityEvent({
        eventType: "honeypot_triggered",
        ipAddress: clientIp,
        email,
        userAgent,
      })
      // Artificial slight delay to waste bot resources
      await new Promise((resolve) => setTimeout(resolve, 800))
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 })
    }

    // 2. Validate basic input presence
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 },
      )
    }

    const trimmedEmail = email.trim().toLowerCase()

    // 3. Pre-flight Rate Limit Check
    const rateLimit = checkLoginRateLimit(trimmedEmail, clientIp)
    if (!rateLimit.allowed || rateLimit.isLocked) {
      return NextResponse.json(
        {
          error: rateLimit.reason || "Terlalu banyak percobaan gagal. Akun dikunci sementara.",
          isLocked: true,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      )
    }

    // 4. Perform Supabase authentication on the server
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    if (authError || !authData.user) {
      // Record failed attempt
      const result = await recordFailedLoginAttempt(trimmedEmail, clientIp, userAgent)

      if (result.isLocked) {
        return NextResponse.json(
          {
            error: result.reason,
            isLocked: true,
            retryAfterSeconds: result.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(result.retryAfterSeconds),
            },
          },
        )
      }

      const attemptsRemainingMsg =
        result.remainingAttempts <= 2
          ? ` (Sisa ${result.remainingAttempts} kesempatan sebelum login dikunci)`
          : ""

      return NextResponse.json(
        {
          error: `Email atau password salah.${attemptsRemainingMsg}`,
          remainingAttempts: result.remainingAttempts,
          isLocked: false,
        },
        { status: 401 },
      )
    }

    // 5. Successful authentication — reset rate limit counters
    await resetLoginRateLimit(trimmedEmail, clientIp, userAgent)

    // Check user profile for redirect destination
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", authData.user.id)
      .maybeSingle()

    const redirectTo = profile && !profile.onboarding_complete ? "/settings" : "/dashboard"

    return NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error) {
    console.error("[api/auth/login] Unexpected error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba beberapa saat lagi." },
      { status: 500 },
    )
  }
}
