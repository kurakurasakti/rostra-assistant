import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const waUrl = (process.env.WA_SERVICE_URL || 'http://localhost:3001').replace(/\/$/, '')
  const res = await fetch(`${waUrl}/session/${user.id}/qr`)
  if (!res.ok) {
    return NextResponse.json({ error: `WA service QR failed: ${res.status}` }, { status: 502 })
  }
  const data = await res.json()
  return NextResponse.json(data)
}
