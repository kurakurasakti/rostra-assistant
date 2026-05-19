import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const WA_SERVICE_URL = process.env.WA_SERVICE_URL || 'http://localhost:3001'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Disconnect from wa-service (best-effort)
  await fetch(`${WA_SERVICE_URL}/session/${user.id}/disconnect`, { method: 'POST' }).catch(() => {})

  await supabase
    .from('profiles')
    .update({
      wa_connected: false,
      onboarding_complete: false,
    })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
