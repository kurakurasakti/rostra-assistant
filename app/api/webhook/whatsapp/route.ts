import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { normalizeWANumber } from '@/lib/whatsapp'
import { scanForInjection } from '@/lib/security'
import { classifyAndDraft } from '@/lib/openrouter'
import { sendEscalationNotification } from '@/lib/notifications'

export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET ?? ''
  const sig = request.headers.get('x-webhook-secret') ?? ''

  const authorized =
    secret.length > 0 &&
    sig.length === secret.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(secret))

  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  console.log('[webhook] received payload:', JSON.stringify(body).slice(0, 200))

  // Return 200 IMMEDIATELY — WA service must not timeout
  processIncomingMessage(body).catch((err) =>
    console.error('[webhook] error pemrosesan:', err),
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}

async function processIncomingMessage(payload: any) {
  // Baileys payload: { userId, sender, message, name, timestamp, messageId, fromMe, media_url?, media_type?, media_size? }
  const userId    = String(payload.userId    ?? '').trim()
  const sender    = String(payload.sender    ?? '').trim()
  const message   = String(payload.message   ?? '').trim()
  const name      = String(payload.name      ?? '').trim()
  const messageId = String(payload.messageId ?? payload.inboxid ?? '').trim()
  const mediaUrl  = payload.media_url  ? String(payload.media_url)  : null
  const mediaType = payload.media_type ? String(payload.media_type)  : null
  const mediaSize = payload.media_size ? Number(payload.media_size)  : null
  const isMedia   = !!mediaUrl
  const fromMe    = !!payload.fromMe

  console.log('[webhook] processing:', { userId: userId.slice(0, 8) + '...', sender, msgLen: message.length, isMedia, fromMe })

  if (!userId || !sender || (!message && !isMedia)) {
    console.warn('[webhook] missing required fields', { userId: !!userId, sender: !!sender, message: !!message, isMedia })
    return
  }

  const supabase = await createServiceClient()
  console.log('[webhook] supabase client created, SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Normalize sender number
  const normalizedSender = normalizeWANumber(sender)
  console.log('[webhook] normalized sender:', { raw: sender, normalized: normalizedSender })
  if (!normalizedSender) {
    console.warn('[webhook] invalid sender format', { sender })
    return
  }

  // Find client by WA number
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, ai_notes')
    .eq('user_id', userId)
    .eq('whatsapp_number', normalizedSender)
    .maybeSingle()

  // Security scan for injection
  const injectionCheck = scanForInjection(message)
  if (injectionCheck.isSuspicious) {
    console.warn('[webhook] injection attempt detected', {
      userId,
      sender: normalizedSender,
      reason: injectionCheck.reason,
    })

    const receivedAt = payload.timestamp
      ? new Date(payload.timestamp * 1000).toISOString()
      : new Date().toISOString()

    await supabase.from('inbox_messages').insert({
      user_id: userId,
      client_id: client?.id ?? null,
      direction: fromMe ? 'keluar' : 'masuk',
      whatsapp_number: normalizedSender,
      sender_name: name || null,
      message_body: message,
      wa_message_id: messageId || null,
      classification: 'injection_attempt',
      status: 'dieskalasi',
      received_at: receivedAt,
    })

    sendEscalationNotification(userId, name || normalizedSender, message, 'injection').catch(() => {})

    void supabase.from('security_logs').insert({
      user_id: userId,
      whatsapp_number: normalizedSender,
      message_body: message,
      threat_type: 'injection_attempt',
    })

    return
  }

  const receivedAt = payload.timestamp
    ? new Date(payload.timestamp * 1000).toISOString()
    : new Date().toISOString()

  // Insert message into inbox using upsert for idempotency
  const { data: insertedMessage, error: insertError } = await supabase
    .from('inbox_messages')
    .upsert(
      {
        user_id:         userId,
        client_id:       client?.id ?? null,
        direction:       fromMe ? 'keluar' : 'masuk',
        whatsapp_number: normalizedSender,
        sender_name:     name || null,
        message_body:    message || (mediaType === 'image' ? '[Foto]' : '[Dokumen]'),
        wa_message_id:   messageId || null,
        classification:  'tidak_diketahui',
        status:          fromMe ? 'dibalas' : (isMedia ? 'dieskalasi' : 'baru'),
        received_at:     receivedAt,
        media_url:       mediaUrl,
        media_type:      mediaType,
        media_size:      mediaSize,
      },
      {
        onConflict: 'user_id,wa_message_id',
        ignoreDuplicates: true,
      }
    )
    .select('id')
    .maybeSingle()

  if (insertError) {
    console.error('[webhook] insert/upsert failed:', JSON.stringify(insertError))
    return
  }

  // If duplicate ignored, insertedMessage could be null
  if (!insertedMessage) {
    console.log('[webhook] message ignored (duplicate)', { sender: normalizedSender, messageId })
    return
  }

  console.log('[webhook] insert SUCCESS id:', insertedMessage.id, 'sender:', normalizedSender, 'isMedia:', isMedia)

  if (isMedia && !fromMe) {
    // Media always escalated to owner — no AI involvement
    sendEscalationNotification(userId, name || normalizedSender, message || '[Media]', 'sensitif').catch(() => {})
    return
  }

  // Background: classify and draft (only for incoming messages, not sent by owner)
  if (!fromMe) {
    classifyAndDraft(insertedMessage.id, message, userId).catch((err) =>
      console.error('[classifyAndDraft] error:', err),
    )
  }
}
