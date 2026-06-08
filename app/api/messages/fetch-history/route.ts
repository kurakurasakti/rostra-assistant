import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchChatHistory } from '@/lib/whatsapp'

// Proxies an on-demand "load N more" request to rostra-wa, which calls Baileys'
// fetchMessageHistory() and forwards the resulting batch to /api/webhook/whatsapp/history
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    whatsapp_number: string
    oldest_message_id: string
    oldest_from_me: boolean
    oldest_received_at: string
  }

  if (!body.whatsapp_number || !body.oldest_message_id || !body.oldest_received_at) {
    return NextResponse.json(
      { error: 'whatsapp_number, oldest_message_id, dan oldest_received_at wajib diisi' },
      { status: 400 },
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('wa_connected')
    .eq('id', user.id)
    .single()

  if (!profile?.wa_connected) {
    return NextResponse.json({ error: 'WhatsApp belum terhubung' }, { status: 400 })
  }

  const chatJid = body.whatsapp_number.includes('@')
    ? body.whatsapp_number
    : `${body.whatsapp_number}@s.whatsapp.net`

  const oldestMsgKey = {
    remoteJid: chatJid,
    fromMe: !!body.oldest_from_me,
    id: body.oldest_message_id,
  }
  const oldestMsgTimestampMs = new Date(body.oldest_received_at).getTime()

  try {
    const result = await fetchChatHistory(user.id, chatJid, oldestMsgKey, oldestMsgTimestampMs, 5)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WA service error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
