import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { message_id: string }
  if (!body.message_id) return NextResponse.json({ error: 'message_id required' }, { status: 400 })
  const [msgRes, profileRes] = await Promise.all([
    supabase
      .from('scheduled_messages')
      .select('*')
      .eq('id', body.message_id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('wa_connected')
      .eq('id', user.id)
      .single(),
  ])

  if (!msgRes.data) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  if (!profileRes.data?.wa_connected) {
    return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 })
  }

  try {
    await sendTextMessage(
      msgRes.data.whatsapp_number,
      msgRes.data.message_body,
      user.id,
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send'
    await supabase
      .from('scheduled_messages')
      .update({ status: 'gagal', error_message: msg })
      .eq('id', body.message_id)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  await supabase
    .from('scheduled_messages')
    .update({ status: 'terkirim', sent_at: new Date().toISOString() })
    .eq('id', body.message_id)

  return NextResponse.json({ ok: true })
}
