import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const WA_SERVICE_URL = process.env.WA_SERVICE_URL || 'http://localhost:3001'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Consume body (ignored — number not needed with Baileys)
  await request.json().catch(() => ({}))

  const connectRes = await fetch(`${WA_SERVICE_URL}/session/${user.id}/connect`, {
    method: 'POST',
  })
  if (!connectRes.ok) {
    return NextResponse.json({ error: 'Gagal membuat WA session' }, { status: 502 })
  }
  const connectData = await connectRes.json()

  // Already connected — no QR needed
  if (connectData.status === 'connected') {
    return NextResponse.json({ connected: true, qr_base64: null })
  }

  // Poll for QR (up to 10s)
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const qrRes = await fetch(`${WA_SERVICE_URL}/session/${user.id}/qr`)
    if (!qrRes.ok) continue
    const qrData = await qrRes.json()

    if (qrData.status === 'connected') {
      return NextResponse.json({ connected: true, qr_base64: null })
    }
    if (qrData.qr) {
      // QRCode.toDataURL returns full data URL — strip prefix for frontend
      const raw = qrData.qr as string
      const qrBase64 = raw.startsWith('data:') ? raw.split(',')[1] : raw
      return NextResponse.json({ qr_base64: qrBase64 })
    }
  }

  return NextResponse.json({ error: 'QR timeout, coba lagi' }, { status: 504 })
}
