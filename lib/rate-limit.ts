import { NextResponse } from "next/server"
import { getClientIp } from "@/lib/auth/rate-limiter"
import { createServiceClient } from "@/lib/supabase/server"

export { getClientIp }

export interface AIRateLimitStatus {
  allowed: boolean
  remainingHourly: number
  remainingDaily: number
  remainingTokens: number
  retryAfterSeconds: number
  reason?: string
  limitType?: "hourly" | "daily" | "token_cap" | "ip"
}

interface UserUsageRecord {
  timestamps: number[]
  estTokens: number
  day: string
  lastDbSync: number
}

interface IPUsageRecord {
  timestamps: number[]
}

// Configuration Constants
export const AI_RATE_LIMIT_CONFIG = {
  MAX_HOURLY_REQUESTS: 30, // max 30 AI requests/hour per user
  MAX_DAILY_REQUESTS: 200, // max 200 AI requests/day per user
  MAX_HOURLY_IP_REQUESTS: 60, // max 60 AI requests/hour per IP
  MAX_DAILY_TOKENS: 100_000, // max 100k tokens/day per user
  HOURLY_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  DAILY_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
}

// In-memory caches
const userUsageStore = new Map<string, UserUsageRecord>()
const ipUsageStore = new Map<string, IPUsageRecord>()

/**
 * Estimate token count from text (~4 characters per token heuristic)
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

/**
 * Format retry duration into friendly Indonesian text
 */
export function formatAIRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} detik`
  }
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes} menit`
  }
  const hours = Math.ceil(minutes / 60)
  return `${hours} jam`
}

/**
 * Check if the user/IP is within rate limits and daily token cap
 */
export async function checkAIRateLimit(
  userId: string,
  ip?: string,
  estimatedTokens: number = 0,
): Promise<AIRateLimitStatus> {
  const now = Date.now()
  const today = new Date(now).toISOString().split("T")[0]

  // 1. IP rate limit check (if IP provided)
  if (ip) {
    let ipRecord = ipUsageStore.get(ip)
    if (ipRecord) {
      ipRecord.timestamps = ipRecord.timestamps.filter(
        (t) => now - t < AI_RATE_LIMIT_CONFIG.HOURLY_WINDOW_MS,
      )
      if (ipRecord.timestamps.length >= AI_RATE_LIMIT_CONFIG.MAX_HOURLY_IP_REQUESTS) {
        const oldest = ipRecord.timestamps[0]
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldest + AI_RATE_LIMIT_CONFIG.HOURLY_WINDOW_MS - now) / 1000),
        )
        return {
          allowed: false,
          remainingHourly: 0,
          remainingDaily: 0,
          remainingTokens: 0,
          retryAfterSeconds,
          reason: `Terlalu banyak permintaan AI dari perangkat ini. Silakan coba lagi dalam ${formatAIRetryTime(retryAfterSeconds)}.`,
          limitType: "ip",
        }
      }
    }
  }

  // 2. User rate limit & token cap check
  let userRecord = userUsageStore.get(userId)
  if (!userRecord) {
    userRecord = {
      timestamps: [],
      estTokens: 0,
      day: today,
      lastDbSync: 0,
    }
    userUsageStore.set(userId, userRecord)
  }

  // Reset daily tokens if day changed
  if (userRecord.day !== today) {
    userRecord.day = today
    userRecord.estTokens = 0
    userRecord.lastDbSync = 0
  }

  // Prune timestamps older than 24 hours
  userRecord.timestamps = userRecord.timestamps.filter(
    (t) => now - t < AI_RATE_LIMIT_CONFIG.DAILY_WINDOW_MS,
  )

  // Try syncing token count with Supabase DB once per session/day or on first check
  if (userRecord.lastDbSync === 0) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = await createServiceClient()
        const { data } = await supabase
          .from("ai_usage")
          .select("requests, est_tokens")
          .eq("user_id", userId)
          .eq("day", today)
          .maybeSingle()

        if (data) {
          userRecord.estTokens = Math.max(userRecord.estTokens, data.est_tokens ?? 0)
        }
      } catch {
        // Supabase network error, fallback to memory
      }
    }
    userRecord.lastDbSync = now
  }


  const hourlyTimestamps = userRecord.timestamps.filter(
    (t) => now - t < AI_RATE_LIMIT_CONFIG.HOURLY_WINDOW_MS,
  )
  const hourlyCount = hourlyTimestamps.length
  const dailyCount = userRecord.timestamps.length
  const currentTokens = userRecord.estTokens

  // Check hourly request limit (max 30 / hour)
  if (hourlyCount >= AI_RATE_LIMIT_CONFIG.MAX_HOURLY_REQUESTS) {
    const oldest = hourlyTimestamps[0]
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + AI_RATE_LIMIT_CONFIG.HOURLY_WINDOW_MS - now) / 1000),
    )
    return {
      allowed: false,
      remainingHourly: 0,
      remainingDaily: Math.max(0, AI_RATE_LIMIT_CONFIG.MAX_DAILY_REQUESTS - dailyCount),
      remainingTokens: Math.max(0, AI_RATE_LIMIT_CONFIG.MAX_DAILY_TOKENS - currentTokens),
      retryAfterSeconds,
      reason: `Batas permintaan AI per jam tercapai (maks ${AI_RATE_LIMIT_CONFIG.MAX_HOURLY_REQUESTS} permintaan/jam). Silakan coba lagi dalam ${formatAIRetryTime(retryAfterSeconds)}.`,
      limitType: "hourly",
    }
  }

  // Check daily request limit (max 200 / day)
  if (dailyCount >= AI_RATE_LIMIT_CONFIG.MAX_DAILY_REQUESTS) {
    const oldest = userRecord.timestamps[0]
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + AI_RATE_LIMIT_CONFIG.DAILY_WINDOW_MS - now) / 1000),
    )
    return {
      allowed: false,
      remainingHourly: 0,
      remainingDaily: 0,
      remainingTokens: Math.max(0, AI_RATE_LIMIT_CONFIG.MAX_DAILY_TOKENS - currentTokens),
      retryAfterSeconds,
      reason: `Batas permintaan AI harian tercapai (maks ${AI_RATE_LIMIT_CONFIG.MAX_DAILY_REQUESTS} permintaan/hari). Silakan coba lagi dalam ${formatAIRetryTime(retryAfterSeconds)}.`,
      limitType: "daily",
    }
  }

  // Check daily token cap (max 100k tokens / day)
  if (currentTokens + estimatedTokens > AI_RATE_LIMIT_CONFIG.MAX_DAILY_TOKENS) {
    // Seconds until end of current UTC day
    const tomorrow = new Date(now)
    tomorrow.setUTCHours(24, 0, 0, 0)
    const retryAfterSeconds = Math.max(1, Math.ceil((tomorrow.getTime() - now) / 1000))
    return {
      allowed: false,
      remainingHourly: Math.max(0, AI_RATE_LIMIT_CONFIG.MAX_HOURLY_REQUESTS - hourlyCount),
      remainingDaily: Math.max(0, AI_RATE_LIMIT_CONFIG.MAX_DAILY_REQUESTS - dailyCount),
      remainingTokens: 0,
      retryAfterSeconds,
      reason: `Batas token AI harian tercapai (maks 100.000 token/hari). Silakan coba lagi besok.`,
      limitType: "token_cap",
    }
  }

  return {
    allowed: true,
    remainingHourly: AI_RATE_LIMIT_CONFIG.MAX_HOURLY_REQUESTS - hourlyCount,
    remainingDaily: AI_RATE_LIMIT_CONFIG.MAX_DAILY_REQUESTS - dailyCount,
    remainingTokens: Math.max(0, AI_RATE_LIMIT_CONFIG.MAX_DAILY_TOKENS - currentTokens),
    retryAfterSeconds: 0,
  }
}

/**
 * Record actual/estimated AI usage for a user and IP, and persist to Supabase
 */
export async function recordAIUsage(
  userId: string,
  tokens: number = 250,
  ip?: string,
): Promise<void> {
  const now = Date.now()
  const today = new Date(now).toISOString().split("T")[0]
  const safeTokens = Math.max(1, tokens)

  // 1. Update in-memory user record
  let userRecord = userUsageStore.get(userId)
  if (!userRecord || userRecord.day !== today) {
    userRecord = {
      timestamps: userRecord ? userRecord.timestamps : [],
      estTokens: userRecord?.day === today ? userRecord.estTokens : 0,
      day: today,
      lastDbSync: now,
    }
    userUsageStore.set(userId, userRecord)
  }

  userRecord.timestamps.push(now)
  userRecord.estTokens += safeTokens

  // 2. Update in-memory IP record
  if (ip) {
    let ipRecord = ipUsageStore.get(ip)
    if (!ipRecord) {
      ipRecord = { timestamps: [] }
      ipUsageStore.set(ip, ipRecord)
    }
    ipRecord.timestamps.push(now)
  }

  // 3. Persist to Supabase public.ai_usage table if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = await createServiceClient()
      const { data: existing } = await supabase
        .from("ai_usage")
        .select("id, requests, est_tokens")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle()

      if (existing) {
        await supabase
          .from("ai_usage")
          .update({
            requests: (existing.requests ?? 0) + 1,
            est_tokens: (existing.est_tokens ?? 0) + safeTokens,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      } else {
        await supabase.from("ai_usage").insert({
          user_id: userId,
          day: today,
          requests: 1,
          est_tokens: safeTokens,
        })
      }
    } catch (err) {
      // Non-blocking catch to prevent DB issues from failing user requests
      console.error("[recordAIUsage] Supabase log error:", err)
    }
  }
}

/**
 * Reset in-memory rate limit stores (useful for tests and admin resets)
 */
export function resetAIRateLimit(userId?: string, ip?: string): void {
  if (userId) {
    userUsageStore.delete(userId)
  } else {
    userUsageStore.clear()
  }

  if (ip) {
    ipUsageStore.delete(ip)
  } else if (!userId) {
    ipUsageStore.clear()
  }
}

/**
 * Return standard 429 Rate Limit Response with Retry-After header
 */
export function createAIRateLimitResponse(
  retryAfterSeconds: number,
  reason: string = "Batas penggunaan AI tercapai.",
): NextResponse {
  return NextResponse.json(
    {
      error: reason,
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  )
}
