import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    whatsapp_number: string
    message: string
    reply_to_id?: string
  }

  if (!body.whatsapp_number || !body.message) {
    return NextResponse.json({ error: 'whatsapp_number and message required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('fonnte_device_token, wa_connected')
    .eq('id', user.id)
    .single()

  if (!profile?.fonnte_device_token) {
    return NextResponse.json({ error: 'WhatsApp belum terhubung' }, { status: 400 })
  }
  if (!profile.wa_connected) {
    return NextResponse.json({ error: 'Perangkat WhatsApp tidak aktif' }, { status: 400 })
  }

  try {
    await sendTextMessage(body.whatsapp_number, body.message, profile.fonnte_device_token)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fonnte error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Save outgoing message to inbox
  await supabase.from('inbox_messages').insert({
    user_id: user.id,
    direction: 'keluar',
    whatsapp_number: body.whatsapp_number,
    message_body: body.message,
    classification: 'rutin',
    status: 'dibalas',
  })

  // Mark incoming message as replied
  if (body.reply_to_id) {
    await supabase
      .from('inbox_messages')
      .update({ status: 'dibalas', replied_at: new Date().toISOString() })
      .eq('id', body.reply_to_id)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
