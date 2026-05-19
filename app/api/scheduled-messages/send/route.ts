import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { message_id: string }
  if (!body.message_id) return NextResponse.json({ error: 'message_id required' }, { status: 400 })

  const { data: msg } = await supabase
    .from('scheduled_messages')
    .select('*')
    .eq('id', body.message_id)
    .eq('user_id', user.id)
    .single()

  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  try {
    await sendTextMessage(msg.whatsapp_number, msg.message_body, user.id)
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Failed to send'
    await supabase
      .from('scheduled_messages')
      .update({ status: 'gagal', error_message: errMsg })
      .eq('id', body.message_id)
    return NextResponse.json({ error: errMsg }, { status: 502 })
  }

  await supabase
    .from('scheduled_messages')
    .update({ status: 'terkirim', sent_at: new Date().toISOString() })
    .eq('id', body.message_id)

  return NextResponse.json({ ok: true })
}
