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
    console.error('[webhook] processing error:', err),
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}

async function processIncomingMessage(payload: any) {
  // Baileys payload: { userId, sender, message, name, timestamp, messageId }
  const userId = String(payload.userId ?? '').trim()
  const sender = String(payload.sender ?? '').trim()
  const message = String(payload.message ?? '').trim()
  const name = String(payload.name ?? '').trim()
  const messageId = String(payload.messageId ?? '').trim()

  console.log('[webhook] processing:', { userId: userId.slice(0, 8) + '...', sender, msgLen: message.length, message })

  if (!userId || !sender || !message) {
    console.warn('[webhook] missing required fields', { userId: !!userId, sender: !!sender, message: !!message })
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

    await supabase.from('inbox_messages').insert({
      user_id: userId,
      client_id: client?.id ?? null,
      direction: 'masuk',
      whatsapp_number: normalizedSender,
      sender_name: name || null,
      message_body: message,
      wa_message_id: messageId || null,
      classification: 'injection_attempt',
      status: 'dieskalasi',
      received_at: new Date().toISOString(),
    })

    sendEscalationNotification(userId, name || normalizedSender, message, 'injection').catch(() => {})

    supabase.from('security_logs').insert({
      user_id: userId,
      whatsapp_number: normalizedSender,
      message_body: message,
      threat_type: 'injection_attempt',
    }).catch(() => {})

    return
  }

  // Insert message into inbox
  const { data: insertedMessage, error: insertError } = await supabase
    .from('inbox_messages')
    .insert({
      user_id: userId,
      client_id: client?.id ?? null,
      direction: 'masuk',
      whatsapp_number: normalizedSender,
      sender_name: name || null,
      message_body: message,
      wa_message_id: messageId || null,
      classification: 'tidak_diketahui',
      status: 'baru',
      received_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !insertedMessage) {
    console.error('[webhook] insert failed:', JSON.stringify(insertError))
    return
  }

  console.log('[webhook] insert SUCCESS id:', insertedMessage.id, 'sender:', normalizedSender)

  // Background: classify and draft (fire-and-forget)
  classifyAndDraft(insertedMessage.id, message, userId).catch((err) =>
    console.error('[classifyAndDraft] error:', err),
  )
}
