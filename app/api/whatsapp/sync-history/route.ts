import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Triggered by frontend ~10s after WA connection detected.
// Tells rostra-wa to re-forward its cached messaging-history.set batch to /api/webhook/whatsapp/history.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const waUrl = process.env.WA_SERVICE_URL
  if (!waUrl) return NextResponse.json({ error: 'WA_SERVICE_URL not configured' }, { status: 500 })

  try {
    const res = await fetch(`${waUrl}/session/${user.id}/sync-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WA service error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
