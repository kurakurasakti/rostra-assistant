import { NextResponse } from "next/server"
import {
  extractBusinessMessages,
  extractConversationContext,
  extractQAPairs,
  parseWhatsAppExport,
  selectBestExamples,
} from "@/lib/chat-parser"
import { analyzeBrandVoice } from "@/lib/openrouter"
import {
  checkAIRateLimit,
  createAIRateLimitResponse,
  estimateTokens,
  getClientIp,
  recordAIUsage,
} from "@/lib/rate-limit"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { QACategory } from "@/types"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as { sender: string; file_content: string }
  if (!body.sender || !body.file_content) {
    return NextResponse.json({ error: "sender and file_content required" }, { status: 400 })
  }

  const ip = getClientIp(new Headers(request.headers))
  const estTokens = estimateTokens(body.file_content) + 600

  const rateLimit = await checkAIRateLimit(user.id, ip, estTokens)
  if (!rateLimit.allowed) {
    return createAIRateLimitResponse(rateLimit.retryAfterSeconds, rateLimit.reason)
  }

  const analysis = parseWhatsAppExport(body.file_content)
  const messages = extractBusinessMessages(analysis, body.sender)

  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages found for selected sender" }, { status: 400 })
  }

  const conversationContext = extractConversationContext(analysis, body.sender)
  const brandVoice = await analyzeBrandVoice(messages, conversationContext)
  await recordAIUsage(user.id, estTokens, ip)


  // Extract few-shot examples from full parsed conversation (both sides)
  const rawPairs = extractQAPairs(analysis.messages, body.sender)
  const examples = selectBestExamples(rawPairs)

  // Save brand_voice + conversation_examples
  console.log("[analyze-voice] Saving brand_voice for user:", user.id)
  const serviceClient = await createServiceClient()
  const { data: updateData, error: updateError } = await serviceClient
    .from("profiles")
    .update({
      brand_voice: brandVoice,
      conversation_examples: examples,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select()

  if (updateError) {
    console.error("[analyze-voice] Update error:", updateError)
  }

  // If profile doesn't exist, insert it
  if (!updateData || updateData.length === 0) {
    console.log("[analyze-voice] Profile missing, inserting for user:", user.id)
    const { error: insertError } = await serviceClient.from("profiles").insert({
      id: user.id,
      brand_voice: brandVoice,
      conversation_examples: examples,
    })
    if (insertError) {
      console.error("[analyze-voice] Insert error:", insertError)
    }
  } else {
    console.log("[analyze-voice] Successfully updated brand_voice and examples")
  }

  const examplesByCategory = examples.reduce<Record<string, number>>(
    (acc, ex) => {
      acc[ex.category] = (acc[ex.category] ?? 0) + 1
      return acc
    },
    {} as Record<QACategory, number>,
  )

  return NextResponse.json({
    brand_voice: brandVoice,
    message_count: messages.length,
    examples_count: examples.length,
    examples_by_category: examplesByCategory,
  })
}
