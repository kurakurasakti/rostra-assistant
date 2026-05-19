import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { userId } = body

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ wa_connected: true, onboarding_complete: true })
    .eq('id', userId)

  return NextResponse.json({ ok: true })
}
