import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const waUrl = process.env.WA_SERVICE_URL
  if (!waUrl) return NextResponse.json({ error: 'WA_SERVICE_URL not configured' }, { status: 500 })

  const targetUrl = `${waUrl}/session/${user.id}/connect`
  console.log(`[whatsapp/connect] WA_SERVICE_URL="${waUrl}" targetUrl="${targetUrl}" userId="${user.id}"`)

  const res = await fetch(targetUrl, { method: 'POST' })
  console.log(`[whatsapp/connect] WA service responded status=${res.status} ok=${res.ok}`)
  if (!res.ok) {
    const text = await res.text()
    console.log(`[whatsapp/connect] WA service error body: ${text}`)
    return NextResponse.json({ error: `WA service error: ${text}` }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
