import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  const waUrl = (process.env.WA_SERVICE_URL || 'http://localhost:3001').replace(/\/$/, '')
  const res = await fetch(`${waUrl}/session/${user.id}/connect`, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `WA service error: ${text}` }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
