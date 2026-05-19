import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const waUrl = process.env.WA_SERVICE_URL
  if (!waUrl) return NextResponse.json({ error: 'WA_SERVICE_URL not configured' }, { status: 500 })

  const res = await fetch(`${waUrl}/session/${user.id}/connect`, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `WA service error: ${text}` }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
