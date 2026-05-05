import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('profiles')
    .update({
      fonnte_device_id: null,
      fonnte_device_token: null,
      wa_connected: false,
      onboarding_complete: false,
    })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
