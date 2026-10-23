import { withErrorHandler } from "@/lib/api-handler"
import { calculateCompleteness } from "@/lib/business-knowledge"
import { extractBusinessKnowledge, extractBusinessKnowledgeFromImages } from "@/lib/openrouter"
import {
  checkAIRateLimit,
  createAIRateLimitResponse,
  estimateTokens,
  getClientIp,
  recordAIUsage,
} from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import type { BusinessKnowledgeStructured } from "@/types"

function extractFailed() {
  return Response.json(
    { error: "Gagal menganalisa info bisnis. Layanan AI sedang tidak tersedia, coba lagi nanti." },
    { status: 502 },
  )
}

async function handlePOST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const ip = getClientIp(new Headers(req.headers))

  if (body.images && Array.isArray(body.images) && body.images.length > 0) {
    const estTokens = 1200
    const rateLimit = await checkAIRateLimit(user.id, ip, estTokens)
    if (!rateLimit.allowed) {
      return createAIRateLimitResponse(rateLimit.retryAfterSeconds, rateLimit.reason)
    }

    let structured: BusinessKnowledgeStructured
    try {
      structured = await extractBusinessKnowledgeFromImages(body.images)
    } catch {
      return extractFailed()
    }
    await recordAIUsage(user.id, estTokens, ip)
    const completeness = calculateCompleteness(structured)
    return Response.json({ structured, completeness })
  }

  const { raw_text } = body
  if (!raw_text?.trim() || raw_text.trim().length < 20) {
    return Response.json(
      { error: "Deskripsi terlalu singkat. Ceritakan lebih detail." },
      { status: 400 },
    )
  }

  const estTokens = estimateTokens(raw_text) + 800
  const rateLimit = await checkAIRateLimit(user.id, ip, estTokens)
  if (!rateLimit.allowed) {
    return createAIRateLimitResponse(rateLimit.retryAfterSeconds, rateLimit.reason)
  }

  let structured: BusinessKnowledgeStructured
  try {
    structured = await extractBusinessKnowledge(raw_text)
  } catch {
    return extractFailed()
  }
  await recordAIUsage(user.id, estTokens, ip)
  const completeness = calculateCompleteness(structured)
  return Response.json({ structured, completeness })
}

export const POST = withErrorHandler("POST /api/settings/extract-business", handlePOST)
