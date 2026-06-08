import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getQRCode } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const whatsapp_number = body.whatsapp_number as string | undefined
  if (!whatsapp_number) return NextResponse.json({ error: 'whatsapp_number required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, wa_connected')
    .eq('id', user.id)
    .single()

  if (profile?.wa_connected) {
    return NextResponse.json({ status: 'connected' })
  }

  const deviceResult = await getQRCode(user.id)
  if (deviceResult.status === 'connected') {
    await supabase
      .from('profiles')
      .update({ wa_connected: true, onboarding_complete: true })
      .eq('id', user.id)
    return NextResponse.json({ status: 'connected' })
  }

  if (deviceResult.status === 'waiting_scan' && deviceResult.qr) {
    return NextResponse.json({ qr_base64: deviceResult.qr })
  }

  return NextResponse.json(
    { status: 'waiting', qr_base64: deviceResult.qr || null },
    { status: 202 },
  )
}
