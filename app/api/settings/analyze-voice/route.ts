import { NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/api-handler"
import {
  extractBusinessMessages,
  extractConversationContext,
  extractQAPairs,
  parseWhatsAppExport,
  selectBestExamples,
} from "@/lib/chat-parser"
import { analyzeBrandVoice } from "@/lib/openrouter"
import { hasEmbeddingKey, type ReindexResult, upsertKnowledgeChunks } from "@/lib/rag"
import {
  checkAIRateLimit,
  createAIRateLimitResponse,
  estimateTokens,
  getClientIp,
  recordAIUsage,
} from "@/lib/rate-limit"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { QACategory } from "@/types"

export const POST = withErrorHandler("POST /api/settings/analyze-voice", analyzeVoice)

async function analyzeVoice(request: Request) {
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
  let brandVoice: string
  try {
    brandVoice = await analyzeBrandVoice(messages, conversationContext)
  } catch (err) {
    console.error("[analyze-voice] AI analysis failed:", err)
    return NextResponse.json(
      { error: "Layanan AI sedang tidak tersedia. Coba lagi beberapa saat lagi." },
      { status: 502 },
    )
  }
  if (!brandVoice.trim()) {
    return NextResponse.json(
      { error: "AI tidak menghasilkan analisa. Coba lagi atau pilih pengirim lain." },
      { status: 502 },
    )
  }
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

  const saveFailed = NextResponse.json(
    { error: "Gagal menyimpan gaya komunikasi. Coba lagi beberapa saat lagi." },
    { status: 500 },
  )

  if (updateError) {
    console.error("[analyze-voice] Update error:", updateError)
    return saveFailed
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
      return saveFailed
    }
  } else {
    console.log("[analyze-voice] Successfully updated brand_voice and examples")
  }

  // ── RAG re-indexing (awaited, with timeout guard) ────────────────────────
  // The extracted conversation_examples are now part of the profile and will
  // be embedded as individual "example" chunks in the vector store.
  // The response reports the outcome so the UI can surface failures.
  const { data: freshProfile } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const REINDEX_TIMEOUT_MS = 25_000
  let reindex: ReindexResult | null = null
  let reindexWarning: string | null = null

  if (freshProfile && hasEmbeddingKey()) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("reindex timeout")), REINDEX_TIMEOUT_MS),
    )
    try {
      reindex = await Promise.race([upsertKnowledgeChunks(user.id, freshProfile), timeout])
      if (reindex.indexed === 0 && reindex.reused === 0) {
        reindexWarning =
          "Semua embedding gagal — gaya komunikasi tersimpan tapi index RAG tidak berubah."
      }
    } catch (err) {
      console.error("[analyze-voice] RAG re-index failed:", err)
      reindexWarning =
        "Re-index RAG gagal — data tersimpan, index akan diperbarui saat simpan berikutnya."
    }
  } else if (freshProfile) {
    reindexWarning =
      "Embedding API key belum dikonfigurasi — data tersimpan tapi belum ter-index ke RAG."
  }

  console.log(
    `[analyze-voice] RAG re-index done — ${examples.length} examples, ` +
      `indexed=${reindex?.indexed ?? 0} reused=${reindex?.reused ?? 0}`,
  )

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
    reindex,
    warning: reindexWarning,
  })
}
