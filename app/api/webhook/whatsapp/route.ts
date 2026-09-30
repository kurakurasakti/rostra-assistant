import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { sendEscalationNotification, sendQuotaNotification } from "@/lib/notifications"
import { classifyAndDraft } from "@/lib/openrouter"
import { scanForInjection } from "@/lib/security"
import { createServiceClient } from "@/lib/supabase/server"
import {
  checkQuota,
  maybeWarn80Percent,
  shouldNotifyQuotaToday,
  trackUsage,
} from "@/lib/usage"
import { normalizeWANumber } from "@/lib/whatsapp"

export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET ?? ""
  const sig = request.headers.get("x-webhook-secret") ?? ""

  const authorized =
    secret.length > 0 &&
    sig.length === secret.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(secret))

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  console.log("[webhook] received payload:", JSON.stringify(body).slice(0, 200))

  // Return 200 IMMEDIATELY — WA service must not timeout
  processIncomingMessage(body).catch((err) => console.error("[webhook] processing error:", err))

  return NextResponse.json({ ok: true }, { status: 200 })
}

/**
 * media_url is rendered straight into <img src> and <a href> in the inbox,
 * so a javascript: or data: value stored here becomes stored XSS for any
 * dashboard user who views the thread. Only allow the storage origins we
 * actually serve media from.
 */
const ALLOWED_MEDIA_HOSTS = new Set([
  "dpeyfucyrhyuhliitcfd.supabase.co",
  "supabase.co",
])

function validateMediaUrl(value: unknown): string | null {
  const raw = String(value).trim()
  if (!raw) return null

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }

  if (parsed.protocol !== "https:") return null
  if (!ALLOWED_MEDIA_HOSTS.has(parsed.hostname)) return null

  return parsed.toString()
}

async function processIncomingMessage(payload: any) {
  // Baileys payload: { userId, sender, message, name, timestamp, messageId, media_url?, media_type?, media_size? }
  const userId = String(payload.userId ?? "").trim()
  const sender = String(payload.sender ?? "").trim()
  const message = String(payload.message ?? "").trim()
  const name = String(payload.name ?? "").trim()
  const messageId = String(payload.messageId ?? "").trim()
  const mediaUrl = payload.media_url ? validateMediaUrl(payload.media_url) : null
  const mediaType = payload.media_type ? String(payload.media_type) : null
  const mediaSize = payload.media_size ? Number(payload.media_size) : null
  const isMedia = !!mediaUrl || !!mediaType

  console.log("[webhook] processing:", {
    userId: userId.slice(0, 8) + "...",
    sender,
    msgLen: message.length,
    isMedia,
  })

  if (!userId || !sender || (!message && !isMedia)) {
    console.warn("[webhook] missing required fields", {
      userId: !!userId,
      sender: !!sender,
      message: !!message,
      isMedia,
    })
    return
  }

  const supabase = await createServiceClient()
  console.log(
    "[webhook] supabase client created, SERVICE_ROLE_KEY set:",
    !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Normalize sender number
  const normalizedSender = normalizeWANumber(sender)
  console.log("[webhook] normalized sender:", {
    raw: sender,
    normalized: normalizedSender,
  })
  if (!normalizedSender) {
    console.warn("[webhook] invalid sender format", { sender })
    return
  }

  // Find client by WA number
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, ai_notes")
    .eq("user_id", userId)
    .eq("whatsapp_number", normalizedSender)
    .maybeSingle()

  // Security scan for injection
  const injectionCheck = scanForInjection(message)
  if (injectionCheck.isSuspicious) {
    console.warn("[webhook] injection attempt detected", {
      userId,
      sender: normalizedSender,
      reason: injectionCheck.reason,
    })

    await supabase.from("inbox_messages").insert({
      user_id: userId,
      client_id: client?.id ?? null,
      direction: "masuk",
      whatsapp_number: normalizedSender,
      sender_name: client?.name || name || null,
      message_body: message,
      wa_message_id: messageId || null,
      classification: "injection_attempt",
      status: "dieskalasi",
      received_at: new Date().toISOString(),
    })

    sendEscalationNotification(userId, name || normalizedSender, message, "injection").catch(
      () => {},
    )

    void supabase.from("security_logs").insert({
      user_id: userId,
      whatsapp_number: normalizedSender,
      message_body: message,
      threat_type: "injection_attempt",
    })

    return
  }

  // Insert message into inbox
  const { data: insertedMessage, error: insertError } = await supabase
    .from("inbox_messages")
    .insert({
      user_id: userId,
      client_id: client?.id ?? null,
      direction: "masuk",
      whatsapp_number: normalizedSender,
      sender_name: client?.name || name || null,
      message_body:
        message ||
        (mediaType === "image" ? "[Foto]" : mediaType === "audio" ? "[Audio]" : "[Dokumen]"),
      wa_message_id: messageId || null,
      classification: "tidak_diketahui",
      status: isMedia ? "dieskalasi" : "baru",
      received_at: new Date().toISOString(),
      media_url: mediaUrl,
      media_type: mediaType,
      media_size: mediaSize,
    })
    .select("id")
    .single()

  if (insertError || !insertedMessage) {
    console.error("[webhook] insert failed:", JSON.stringify(insertError))
    return
  }

  console.log(
    "[webhook] insert SUCCESS id:",
    insertedMessage.id,
    "sender:",
    normalizedSender,
    "isMedia:",
    isMedia,
  )

  if (isMedia) {
    // Media always escalated to owner — no AI involvement
    const mediaLabel =
      mediaType === "image" ? "[Foto]" : mediaType === "audio" ? "[Audio]" : "[Dokumen]"
    const preview = message ? `${mediaLabel} ${message}` : mediaLabel

    sendEscalationNotification(userId, name || normalizedSender, preview, "media").catch(() => {})
    return
  }

  // Monthly metering: count the incoming message (never throws).
  void trackUsage(userId, { msgs_in: 1 })

  // Quota enforcement (fail-open): when exhausted, store the message as-is
  // with status 'quota_exceeded', notify the owner at most once per day,
  // and skip the AI pipeline entirely. Webhook still returns 200.
  const quota = await checkQuota(userId)
  if (!quota.allowed) {
    try {
      await supabase
        .from("inbox_messages")
        .update({ status: "quota_exceeded" })
        .eq("id", insertedMessage.id)
    } catch (err) {
      console.error("[webhook] quota_exceeded status update failed:", err)
    }
    try {
      const notify = await shouldNotifyQuotaToday(userId, quota.usage.quota_notified_at)
      if (notify) {
        await sendQuotaNotification(
          userId,
          "Kuota pesan habis",
          `Kuota ${quota.plan} bulan ini habis (${quota.usage.msgs_in} pesan). Pesan pelanggan tetap tersimpan, tapi AI berhenti membuat draft sampai kuota direset bulan depan.`,
        )
      }
    } catch (err) {
      console.error("[webhook] quota notification failed:", err)
    }
    return
  }

  // Soft warning at 80% (once per month, never throws).
  void maybeWarn80Percent(userId, quota, (title, body) =>
    sendQuotaNotification(userId, title, body),
  )

  // Background: classify and draft (fire-and-forget)
  classifyAndDraft(insertedMessage.id, message, userId).catch((err) =>
    console.error("[classifyAndDraft] error:", err),
  )
}
