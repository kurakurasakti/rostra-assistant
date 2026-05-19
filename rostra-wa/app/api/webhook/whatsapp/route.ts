import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const payload = await req.json()
  const { userId, sender, message, name, timestamp, messageId } = payload

  if (!userId || !sender || !message) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, brand_voice')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('inbox_messages')
    .insert({
      user_id: userId,
      sender,
      sender_name: name,
      message,
      raw_payload: payload,
      received_at: timestamp
        ? new Date(Number(timestamp) * 1000).toISOString()
        : new Date().toISOString(),
    })

  if (error) {
    console.error('[webhook] Insert error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
