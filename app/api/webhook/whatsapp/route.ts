import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { FonnteWebhookPayload, normalizeWANumber } from '@/lib/whatsapp'
import { scanForInjection } from '@/lib/security'
import { classifyAndDraft } from '@/lib/openrouter'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Body kosong atau tidak valid' }, { status: 400 })
  }

  // Jika body adalah array, proses sebagai sinkronisasi riwayat massal
  if (Array.isArray(body)) {
    processBulkMessages(body).catch((err) =>
      console.error('[webhook] error pemrosesan massal:', err),
    )
    return NextResponse.json({ ok: true, bulk: true }, { status: 200 })
  }

  // Jika pesan tunggal, jalankan logika normal
  processIncomingMessage(body).catch((err) =>
    console.error('[webhook] error pemrosesan:', err),
  )

  return NextResponse.json({ ok: true }, { status: 200 })
}

async function processBulkMessages(payloads: any[]) {
  if (payloads.length === 0) return

  const supabase = await createServiceClient()

  // Kelompokkan berdasarkan userId untuk isolasi tenant
  const userGroups: { [userId: string]: any[] } = {}
  for (const p of payloads) {
    const userId = p.userId
    if (!userId) continue
    if (!userGroups[userId]) {
      userGroups[userId] = []
    }
    userGroups[userId].push(p)
  }

  for (const [userId, messages] of Object.entries(userGroups)) {
    // Cari semua nomor unik pengirim
    const senders = messages
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
    const recordsToInsert = messages
      .map((m) => {
        const normalizedSender = normalizeWANumber(m.sender)
        if (!normalizedSender) return null

        // Deteksi injeksi keamanan
        const injectionCheck = scanForInjection(m.message)
        const classification = injectionCheck.isSuspicious
          ? 'injection_attempt'
          : 'tidak_diketahui'
        const status = injectionCheck.isSuspicious
          ? 'dieskalasi'
          : m.fromMe
          ? 'dibalas'
          : 'dibaca'

        let receivedAt = new Date().toISOString()
        if (m.timestamp) {
          // Baileys timestamp adalah detik, konversi ke milidetik
          receivedAt = new Date(m.timestamp * 1000).toISOString()
        }

        return {
          user_id: userId,
          client_id: clientMap.get(normalizedSender) ?? null,
          direction: m.fromMe ? 'keluar' : 'masuk',
          whatsapp_number: normalizedSender,
          sender_name: m.name || null,
          message_body: m.message,
          wa_message_id: m.messageId || null,
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
      console.error(`[webhook] bulk upsert gagal untuk user ${userId}:`, upsertError)
    } else {
      console.log(
        `[webhook] bulk upsert berhasil untuk user ${userId}: ${recordsToInsert.length} pesan terproses`,
      )
    }
  }
}

async function processIncomingMessage(payload: any) {
  // Validate required fields
  const device = String(payload.device ?? '').trim()
  const sender = String(payload.sender ?? '').trim()
  const message = String(payload.message ?? '').trim()
  const name = String(payload.name ?? '').trim()
  const inboxid = String(payload.inboxid ?? '').trim()
  const userIdFromPayload = String(payload.userId ?? '').trim()

  if (!sender || !message) {
    console.warn('[webhook] missing required fields', { sender: !!sender, message: !!message })
    return
  }

  // Skip media-only messages
  if (payload.url && !message) {
    console.log('[webhook] skipping media-only message')
    return
  }

  const supabase = await createServiceClient()
  let userId = userIdFromPayload

  // Jika tidak ada userId langsung, cari berdasarkan nomor device (Fonnte flow)
  if (!userId) {
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
    userId = profile.id
  }

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
      direction: payload.fromMe ? 'keluar' : 'masuk',
      whatsapp_number: normalizedSender,
      sender_name: name || null,
      message_body: message,
      wa_message_id: inboxid || payload.messageId || null,
      classification: 'injection_attempt',
      status: 'dieskalasi',
      received_at: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString(),
    })

    return
  }

  // Insert message into inbox
  const { data: insertedMessage, error: insertError } = await supabase
    .from('inbox_messages')
    .upsert(
      {
        user_id: userId,
        client_id: client?.id ?? null,
        direction: payload.fromMe ? 'keluar' : 'masuk',
        whatsapp_number: normalizedSender,
        sender_name: name || null,
        message_body: message,
        wa_message_id: inboxid || payload.messageId || null,
        classification: 'tidak_diketahui',
        status: payload.fromMe ? 'dibalas' : 'baru',
        received_at: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString(),
      },
      {
        onConflict: 'user_id,wa_message_id',
        ignoreDuplicates: true,
      }
    )
    .select('id')
    .maybeSingle()

  if (insertError) {
    console.error('[webhook] insert failed', insertError)
    return
  }

  // Jika duplikat diabaikan, insertedMessage bisa null/empty
  if (!insertedMessage) {
    console.log('[webhook] message ignored (duplicate)', { sender: normalizedSender, messageId: inboxid || payload.messageId })
    return
  }

  console.log('[webhook] message inserted', { messageId: insertedMessage.id, sender: normalizedSender })

  // Background: classify and draft (hanya untuk pesan masuk non-injeksian)
  if (!payload.fromMe) {
    classifyAndDraft(insertedMessage.id, message, userId).catch((err) =>
      console.error('[classifyAndDraft] error:', err),
    )
  }
}

