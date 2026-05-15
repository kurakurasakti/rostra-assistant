import { createClient as createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { FonnteWebhookPayload, normalizeWANumber } from '@/lib/whatsapp'
import { scanForInjection } from '@/lib/security'
import { classifyAndDraft } from '@/lib/openrouter'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))

  // Return 200 IMMEDIATELY — Fonnte must not timeout
  processIncomingMessage(body).catch((err) =>
    console.error('[webhook] processing error:', err),
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}

async function processIncomingMessage(payload: any) {
  // Validate required fields
  const device = String(payload.device ?? '').trim()
  const sender = String(payload.sender ?? '').trim()
  const message = String(payload.message ?? '').trim()
  const name = String(payload.name ?? '').trim()
  const inboxid = String(payload.inboxid ?? '').trim()

  if (!device || !sender || !message) {
    console.warn('[webhook] missing required fields', { device: !!device, sender: !!sender, message: !!message })
    return
  }

  // Skip media-only messages
  if (payload.url && !message) {
    console.log('[webhook] skipping media-only message')
    return
  }

  const supabase = await createServiceClient()

  // Multi-tenant routing: find user by device
  const normalizedDevice = normalizeWANumber(device)
  if (!normalizedDevice) {
    console.warn('[webhook] invalid device format', { device })
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, fonnte_device_token, brand_voice')
    .eq('fonnte_device_number', normalizedDevice)
    .maybeSingle()

  if (!profile) {
    console.warn('[webhook] device not found', { device: normalizedDevice })
    return
  }

  const userId = profile.id

  // Normalize sender number
  const normalizedSender = normalizeWANumber(sender)
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

    // Insert as injection attempt
    await supabase.from('inbox_messages').insert({
      user_id: userId,
      client_id: client?.id ?? null,
      direction: 'masuk',
      whatsapp_number: normalizedSender,
      sender_name: name || null,
      message_body: message,
      fonnte_inbox_id: inboxid || null,
      wa_message_id: inboxid || null,
      classification: 'injection_attempt',
      status: 'dieskalasi',
      received_at: new Date().toISOString(),
    })

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
      fonnte_inbox_id: inboxid || null,
      wa_message_id: inboxid || null,
      classification: 'tidak_diketahui',
      status: 'baru',
      received_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !insertedMessage) {
    console.error('[webhook] insert failed', insertError)
    return
  }

  console.log('[webhook] message inserted', { messageId: insertedMessage.id, sender: normalizedSender })

  // Background: classify and draft (fire-and-forget)
  classifyAndDraft(insertedMessage.id, message, userId).catch((err) =>
    console.error('[classifyAndDraft] error:', err),
  )
}
