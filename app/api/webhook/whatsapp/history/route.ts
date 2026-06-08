import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { normalizeWANumber } from '@/lib/whatsapp'
import { scanForInjection } from '@/lib/security'

export async function POST(request: Request) {
  console.log('[webhook-history] POST request received at /api/webhook/whatsapp/history')
  const body = await request.json().catch((err) => {
    console.error('[webhook-history] JSON parse error:', err)
    return null
  })
  console.log('[webhook-history] Request body parsed. isArray:', Array.isArray(body), 'bodyNull:', !body)

  if (!body) {
    console.warn('[webhook-history] Rejected: empty or invalid body')
    return NextResponse.json({ error: 'Body kosong atau tidak valid' }, { status: 400 })
  }

  // Cari array pesan dari payload (bisa langsung array atau { messages: [...] })
  let messagesArray: any[] = []
  if (Array.isArray(body)) {
    messagesArray = body
  } else if (body && Array.isArray(body.messages)) {
    messagesArray = body.messages
  } else if (body) {
    messagesArray = [body]
  }

  if (messagesArray.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  processHistorySync(messagesArray).catch((err) =>
    console.error('[webhook-history] error pemrosesan massal:', err),
  )

  return NextResponse.json({ ok: true, count: messagesArray.length }, { status: 200 })
}

async function processHistorySync(messages: any[]) {
  const supabase = await createServiceClient()

  // Kelompokkan berdasarkan userId untuk isolasi tenant
  const userGroups: { [userId: string]: any[] } = {}
  for (const m of messages) {
    const userId = m.userId
    if (!userId) continue
    if (!userGroups[userId]) {
      userGroups[userId] = []
    }
    userGroups[userId].push(m)
  }

  for (const [userId, userMessages] of Object.entries(userGroups)) {
    // Cari semua nomor unik pengirim
    const senders = userMessages
      .map((m) => normalizeWANumber(m.sender))
      .filter(Boolean) as string[]
    const uniqueSenders = Array.from(new Set(senders))

    if (uniqueSenders.length === 0) continue

    // Ambil data client yang sudah ada secara massal
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

    // Bangun record untuk mass insert
    const recordsToInsert = userMessages
      .map((m) => {
        const normalizedSender = normalizeWANumber(m.sender)
        if (!normalizedSender) return null

        // Deteksi injeksi keamanan
        const injectionCheck = scanForInjection(m.message || m.message_body || '')
        const classification = injectionCheck.isSuspicious
          ? 'injection_attempt'
          : 'tidak_diketahui'
        const status = injectionCheck.isSuspicious
          ? 'dieskalasi'
          : m.fromMe
          ? 'dibalas'
          : 'dibaca'

        let receivedAt = new Date().toISOString()
        const ts = m.timestamp || m.messageTimestamp
        if (ts) {
          // Baileys timestamp adalah detik, konversi ke milidetik
          receivedAt = new Date(ts * 1000).toISOString()
        }

        return {
          user_id: userId,
          client_id: clientMap.get(normalizedSender) ?? null,
          direction: m.fromMe ? 'keluar' : 'masuk',
          whatsapp_number: normalizedSender,
          sender_name: m.name || m.sender_name || null,
          message_body: m.message || m.message_body || '',
          wa_message_id: m.messageId || m.wa_message_id || null,
          classification,
          status,
          received_at: receivedAt,
        }
      })
      .filter(Boolean)

    if (recordsToInsert.length === 0) continue

    // Lakukan upsert dengan mengabaikan duplikat berdasarkan (user_id, wa_message_id)
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
        `[webhook-history] bulk upsert berhasil untuk user ${userId}: ${recordsToInsert.length} pesan riwayat terproses`,
      )
    }
  }
}
