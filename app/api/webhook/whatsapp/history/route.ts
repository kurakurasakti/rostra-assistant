import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { normalizeWANumber } from '@/lib/whatsapp'
import { scanForInjection } from '@/lib/security'

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

  // Get unique senders for bulk client resolution
  const senders = items
    .map((m) => normalizeWANumber(m.sender ?? ''))
    .filter(Boolean) as string[]
  const uniqueSenders = Array.from(new Set(senders))

  if (uniqueSenders.length === 0) return

  // Fetch existing clients for these senders
  const { data: clients } = await supabase
    .from('clients')
    .select('id, whatsapp_number, name')
    .eq('user_id', userId)
    .in('whatsapp_number', uniqueSenders)

  const clientMap = new Map<string, string>()
  const clientNameMap = new Map<string, string>()
  if (clients) {
    for (const c of clients) {
      if (c.whatsapp_number) {
        clientMap.set(c.whatsapp_number, c.id)
        if (c.name) {
          clientNameMap.set(c.whatsapp_number, c.name)
        }
      }
    }
  }

  const rows: Record<string, unknown>[] = []
  for (const item of items) {
    const message = String(item.message ?? '').trim()
    const sender = String(item.sender ?? '').trim()
    if (!message || !sender) continue

    const normalizedSender = normalizeWANumber(sender)
    console.log(`[webhook/history] item: sender=${sender} normalized=${normalizedSender ?? 'SKIPPED'} name=${item.name || 'NONE'}`)
    if (!normalizedSender) continue

    // Security scan for injection
    const injectionCheck = scanForInjection(message)
    const classification = injectionCheck.isSuspicious
      ? 'injection_attempt'
      : 'tidak_diketahui'

    const status = injectionCheck.isSuspicious
      ? 'dieskalasi'
      : item.fromMe
      ? 'dibalas'
      : 'diabaikan'

    rows.push({
      user_id: userId,
      client_id: clientMap.get(normalizedSender) ?? null,
      direction: item.fromMe ? 'keluar' : 'masuk',
      whatsapp_number: normalizedSender,
      sender_name: clientNameMap.get(normalizedSender) || item.name || null,
      message_body: message,
      wa_message_id: item.messageId || null,
      classification,
      status,
      received_at: item.timestamp
        ? new Date(Number(item.timestamp) * 1000).toISOString()
        : new Date().toISOString(),
    })
  }

  if (rows.length === 0) {
    console.log('[webhook/history] nothing new to insert')
    return
  }

  // Insert new rows (ignore duplicates to preserve existing classification/status/drafts)
  const { error } = await supabase
    .from('inbox_messages')
    .upsert(rows, {
      onConflict: 'user_id,wa_message_id',
      ignoreDuplicates: true,
    })

  if (error) {
    console.error('[webhook/history] bulk upsert failed:', JSON.stringify(error))
    return
  }

  // Patch sender_name on existing rows where it's null or still a raw JID string.
  // Runs after upsert so we don't touch classification/status/drafts.
  const rowsWithName = rows.filter(r => r.sender_name && r.wa_message_id)
  if (rowsWithName.length > 0) {
    for (const row of rowsWithName) {
      await supabase
        .from('inbox_messages')
        .update({ sender_name: row.sender_name })
        .eq('user_id', userId)
        .eq('wa_message_id', row.wa_message_id as string)
        .or('sender_name.is.null,sender_name.like.%@s.whatsapp.net,sender_name.like.%@lid')
    }
    console.log(`[webhook/history] sender_name patch attempted for ${rowsWithName.length} rows`)
  }

  console.log(`[webhook/history] done: ${rows.length}/${items.length} rows processed for user ${userId.slice(0, 8)}...`)
}
