import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const waUrl = process.env.WA_SERVICE_URL
  if (!waUrl) return NextResponse.json({ error: 'WA_SERVICE_URL not configured' }, { status: 500 })

  const body = await request.json()
  const { whatsapp_number } = body as { whatsapp_number: string }
  if (!whatsapp_number) return NextResponse.json({ error: 'whatsapp_number required' }, { status: 400 })

  // Get business name for device label in Fonnte
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .single()

  // Register device on Fonnte (idempotent — returns existing token if already registered)
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

  // Save token immediately so status polling can find it
  await supabase
    .from('profiles')
    .update({ fonnte_device_id: deviceId, fonnte_device_token: deviceToken, wa_connected: false })
    .eq('id', user.id)

  // ─── METHOD: Pairing Code (aktif) ────────────────────────────────────────
  // QR method dinonaktifkan sementara karena WhatsApp @lid rollout
  // menyebabkan QR scan disconnect setelah berhasil. Pairing code tidak kena.
  // Untuk revert ke QR: uncomment blok QR di bawah, comment blok ini.
  // Fonnte docs: type="code", field name "whatsapp", response field "url"
  const pairingBody = new URLSearchParams({ type: 'code', whatsapp: whatsapp_number })
  const pairingRes = await fetch(`${FONNTE}/qr`, {
    method: 'POST',
    headers: { Authorization: deviceToken },
    body: pairingBody,
  })

  const pairingData = await pairingRes.json()

  if (!pairingData.status || !pairingData.url) {
    return NextResponse.json(
      { error: pairingData.reason ?? 'Gagal mendapatkan pairing code dari Fonnte' },
      { status: 502 },
    )
  }

  return NextResponse.json({ pairing_code: pairingData.url })

  // ─── METHOD: QR Code (dinonaktifkan sementara) ───────────────────────────
  // Uncomment ini dan comment blok pairing di atas untuk revert ke QR.
  //
  // // Disconnect dulu agar QR baru selalu di-generate (bukan session lama)
  // await fetch(`${FONNTE}/disconnect`, {
  //   method: 'POST',
  //   headers: { Authorization: deviceToken },
  // }).catch(() => {})
  //
  // const qrRes = await fetch(`${FONNTE}/qr`, {
  //   method: 'POST',
  //   headers: { Authorization: deviceToken },
  // })
  // const qrData = await qrRes.json()
  //
  // if (!qrData.status || !qrData.url) {
  //   return NextResponse.json(
  //     { error: qrData.reason ?? 'Gagal mendapatkan QR dari Fonnte' },
  //     { status: 502 },
  //   )
  // }
  // return NextResponse.json({ qr_base64: qrData.url })
}
