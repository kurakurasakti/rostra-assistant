import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FONNTE = 'https://api.fonnte.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const masterToken = process.env.FONNTE_MASTER_TOKEN
  if (!masterToken) return NextResponse.json({ error: 'FONNTE_MASTER_TOKEN not configured' }, { status: 500 })

  const body = await request.json()
  const { whatsapp_number } = body as { whatsapp_number: string }
  if (!whatsapp_number) return NextResponse.json({ error: 'whatsapp_number required' }, { status: 400 })

  // Get business name for device name
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .single()

  // Register device on Fonnte
  const addRes = await fetch(`${FONNTE}/add-device`, {
    method: 'POST',
    headers: { Authorization: masterToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: profile?.business_name ?? user.email,
      device: whatsapp_number,
    }),
  })

  if (!addRes.ok) {
    const text = await addRes.text()
    return NextResponse.json({ error: `Fonnte error: ${text}` }, { status: 502 })
  }

  const addData = await addRes.json()
  const deviceId: string = addData.device ?? addData.id ?? whatsapp_number
  const deviceToken: string = addData.token

  if (!deviceToken) {
    return NextResponse.json({ error: 'No device token returned by Fonnte' }, { status: 502 })
  }

  // Save device info to profile
  await supabase
    .from('profiles')
    .update({ fonnte_device_id: deviceId, fonnte_device_token: deviceToken, wa_connected: false })
    .eq('id', user.id)

  // Get QR code
  const qrRes = await fetch(`${FONNTE}/qr`, {
    method: 'POST',
    headers: { Authorization: deviceToken },
  })

  if (!qrRes.ok) {
    const text = await qrRes.text()
    return NextResponse.json({ error: `QR error: ${text}` }, { status: 502 })
  }

  const qrData = await qrRes.json()
  // Fonnte returns qr as base64 string or URL
  const qrBase64: string = qrData.qr ?? qrData.url ?? ''

  return NextResponse.json({ qr_base64: qrBase64 })
}
