import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { normalizeWANumber } from '@/lib/whatsapp'
import { scanForInjection } from '@/lib/security'
import { timingSafeEqual } from 'crypto'

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

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Body kosong atau tidak valid' }, { status: 400 })
  }

  const userId = String(body.userId ?? '').trim()
  const messagesArray: any[] = Array.isArray(body.messages) ? body.messages : []

  if (!userId || messagesArray.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  // Process history sync asynchronously to avoid webhook timeouts
  processHistorySync(userId, messagesArray).catch((err) =>
    console.error('[webhook-history] error pemrosesan massal:', err),
  )

  return NextResponse.json({ ok: true, count: messagesArray.length }, { status: 200 })
}

async function processHistorySync(userId: string, messages: any[]) {
  const supabase = await createServiceClient()

  // Get unique senders for bulk client resolution
  const senders = messages
    .map((m) => normalizeWANumber(m.sender))
    .filter(Boolean) as string[]
  const uniqueSenders = Array.from(new Set(senders))

  if (uniqueSenders.length === 0) return

  // Fetch existing clients for these senders
  const { data: clients } = await supabase
    .from('clients')
    .select('id, whatsapp_number')
    .eq('user_id', userId)
    .in('whatsapp_number', uniqueSenders)

  const clientMap = new Map<string, string>()
  if (clients) {
    for (const c of clients) {
      if (c.whatsapp_number) {
        clientMap.set(c.whatsapp_number, c.id)
      }
    }
  }

  const recordsToInsert = messages
    .map((m) => {
      const normalizedSender = normalizeWANumber(m.sender)
      if (!normalizedSender) return null

      const messageText = m.message || m.message_body || ''
      const injectionCheck = scanForInjection(messageText)
      const classification = injectionCheck.isSuspicious
        ? 'injection_attempt'
        : 'tidak_diketahui'
      
      const status = injectionCheck.isSuspicious
        ? 'dieskalasi'
        : m.fromMe
        ? 'dibalas'
        : 'diabaikan'

      let receivedAt = new Date().toISOString()
      const ts = m.timestamp || m.messageTimestamp
      if (ts) {
        receivedAt = new Date(Number(ts) * 1000).toISOString()
      }

      return {
        user_id: userId,
        client_id: clientMap.get(normalizedSender) ?? null,
        direction: m.fromMe ? 'keluar' : 'masuk',
        whatsapp_number: normalizedSender,
        sender_name: m.name || m.sender_name || null,
        message_body: messageText,
        wa_message_id: m.messageId || m.wa_message_id || null,
        classification,
        status,
        received_at: receivedAt,
      }
    })
    .filter(Boolean)

  if (recordsToInsert.length === 0) return

  const { error: upsertError } = await supabase
    .from('inbox_messages')
    .upsert(recordsToInsert, {
      onConflict: 'user_id,wa_message_id',
      ignoreDuplicates: true,
    })

  if (upsertError) {
    console.error(`[webhook-history] bulk upsert gagal untuk user ${userId}:`, upsertError)
  } else {
    console.log(
      `[webhook-history] bulk upsert berhasil untuk user ${userId}: ${recordsToInsert.length}/${messages.length} pesan riwayat terproses`,
    )
  }
}
