import { NextResponse } from "next/server"
import { buildAIContext, draftReply } from "@/lib/openrouter"
import {
  checkAIRateLimit,
  createAIRateLimitResponse,
  estimateTokens,
  getClientIp,
  recordAIUsage,
} from "@/lib/rate-limit"
import { validateAIOutput } from "@/lib/security"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as {
    message: string
    brand_voice?: string
    client_id?: string
    history?: Array<{ direction: string; message_body: string }>
    hint?: string
    message_id?: string
  }
  if (!body.message) return NextResponse.json({ error: "message required" }, { status: 400 })

  const ip = getClientIp(new Headers(request.headers))
  const estTokens = estimateTokens(body.message + (body.hint ?? "")) + 500

  const rateLimit = await checkAIRateLimit(user.id, ip, estTokens)
  if (!rateLimit.allowed) {
    return createAIRateLimitResponse(rateLimit.retryAfterSeconds, rateLimit.reason)
  }

  // Fetch profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  // Fetch client if provided
  let client = null
  if (body.client_id) {
    const { data: c } = await supabase
      .from("clients")
      .select("*")
      .eq("id", body.client_id)
      .eq("user_id", user.id)
      .single()
    client = c
  }

  // Build full AI context with client order info
  const systemPrompt = await buildAIContext(profile, client, user.id, body.message)

  const { draft, usage } = await draftReply(
    body.message,
    body.brand_voice ?? "",
    body.history,
    systemPrompt,
    body.hint,
  )

  const actualTokens = usage ? usage.prompt_tokens + usage.completion_tokens : estTokens
  await recordAIUsage(user.id, actualTokens, ip)


  const validation = validateAIOutput(draft)
  if (!validation.safe) {
    return NextResponse.json({ draft: null, flagged: true, reason: validation.reason })
  }

  // Save draft to database if message_id is provided
  if (body.message_id && draft) {
    await supabase
      .from("inbox_messages")
      .update({ ai_draft_reply: draft })
      .eq("id", body.message_id)
      .eq("user_id", user.id)
  }

  return NextResponse.json({ draft, usage })
}
