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
    .select('wa_connected')
    .eq('id', user.id)
    .single()

  if (!profile?.wa_connected) {
    return NextResponse.json({ error: 'WhatsApp belum terhubung' }, { status: 400 })
  }

  try {
    await sendTextMessage(body.whatsapp_number, body.message, user.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WA service error'
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

    // Feedback loop: if sent text differs from ai_draft_reply → record correction
    const { data: original } = await supabase
      .from('inbox_messages')
      .select('ai_draft_reply')
      .eq('id', body.reply_to_id)
      .eq('user_id', user.id)
      .single()

    const originalDraft = original?.ai_draft_reply
    const sentMessage = body.message.trim()

    if (originalDraft && originalDraft.trim() !== sentMessage) {
      await Promise.all([
        supabase.from('ai_feedback').insert({
          user_id: user.id,
          message_id: body.reply_to_id,
          original: originalDraft,
          corrected: sentMessage,
        }),
        supabase.rpc('increment_feedback_count', { uid: user.id }),
      ])
    }
  }

  return NextResponse.json({ ok: true })
}
