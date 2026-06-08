import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { normalizeWANumber } from '@/lib/whatsapp'

// Called by rostra-wa for both passive (on-connect) and on-demand (scroll "+N") history backfill
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
  const count = Array.isArray(body?.messages) ? body.messages.length : 0
  console.log('[webhook/history] received batch:', { userId: String(body?.userId ?? '').slice(0, 8) + '...', count })

  // Return 200 IMMEDIATELY — wa-service must not timeout
  processHistoryBatch(body).catch((err) =>
    console.error('[webhook/history] processing error:', err),
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}

type HistoryItem = {
  sender?: string
  message?: string
  name?: string
  timestamp?: number | null
  messageId?: string
  fromMe?: boolean
}

async function processHistoryBatch(payload: any) {
  const userId = String(payload.userId ?? '').trim()
  const items: HistoryItem[] = Array.isArray(payload.messages) ? payload.messages : []

  if (!userId || items.length === 0) {
    console.warn('[webhook/history] missing userId or empty batch')
    return
  }

  const supabase = await createServiceClient()

  // Dedup against already-stored wa_message_ids (no unique constraint on the column — pre-filter instead)
  const incomingIds = items.map((i) => String(i.messageId ?? '').trim()).filter(Boolean)
  const { data: existing } = incomingIds.length
    ? await supabase
        .from('inbox_messages')
        .select('wa_message_id')
        .eq('user_id', userId)
        .in('wa_message_id', incomingIds)
    : { data: [] as { wa_message_id: string | null }[] }

  const existingIds = new Set((existing ?? []).map((r) => r.wa_message_id))

  const rows: Record<string, unknown>[] = []
  for (const item of items) {
    const messageId = String(item.messageId ?? '').trim()
    if (messageId && existingIds.has(messageId)) continue

    const message = String(item.message ?? '').trim()
    const sender = String(item.sender ?? '').trim()
    if (!message || !sender) continue

    const normalizedSender = normalizeWANumber(sender)
    if (!normalizedSender) continue

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .eq('whatsapp_number', normalizedSender)
      .maybeSingle()

    rows.push({
      user_id: userId,
      client_id: client?.id ?? null,
      direction: item.fromMe ? 'keluar' : 'masuk',
      whatsapp_number: normalizedSender,
      sender_name: item.name || null,
      message_body: message,
      wa_message_id: messageId || null,
      classification: 'tidak_diketahui',
      status: 'diabaikan',
      received_at: item.timestamp
        ? new Date(Number(item.timestamp) * 1000).toISOString()
        : new Date().toISOString(),
    })
  }

  if (rows.length === 0) {
    console.log('[webhook/history] nothing new to insert (all duplicates or invalid)')
    return
  }

  const { error } = await supabase.from('inbox_messages').insert(rows)
  if (error) {
    console.error('[webhook/history] insert failed:', JSON.stringify(error))
    return
  }

  console.log(`[webhook/history] inserted ${rows.length}/${items.length} backfilled messages for user ${userId.slice(0, 8)}...`)
}
