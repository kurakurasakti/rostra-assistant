import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))

  // Fonnte webhook payload fields
  const device: string = String(body.device ?? '').replace(/@[^@]+$/, '').trim()
  const sender: string = String(body.sender ?? '').replace(/@[^@]+$/, '').trim()
  const message: string = String(body.message ?? '').trim()
  const senderName: string | null = body.name ?? null
  const waMessageId: string | null = body.wa_id ?? null

  if (!device || !sender || !message) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Multi-tenant routing: find which user's device received this
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .or(`fonnte_device_id.eq.${device},fonnte_device_number.eq.${device}`)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ ok: true }) // unknown device, silently ignore
  }

  // Match sender to existing client for linking
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', profile.id)
    .eq('whatsapp_number', sender)
    .maybeSingle()

  await supabase.from('inbox_messages').insert({
    user_id: profile.id,
    client_id: client?.id ?? null,
    direction: 'masuk',
    whatsapp_number: sender,
    sender_name: senderName,
    message_body: message,
    classification: 'tidak_diketahui',
    status: 'baru',
    wa_message_id: waMessageId,
  })

  return NextResponse.json({ ok: true })
}
