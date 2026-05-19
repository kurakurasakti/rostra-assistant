import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getDeviceStatus } from '@/lib/whatsapp'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('wa_connected')
    .eq('id', user.id)
    .single()

  const status = await getDeviceStatus(user.id)

  if (status.connected && !profile?.wa_connected) {
    await supabase
      .from('profiles')
      .update({ wa_connected: true, onboarding_complete: true })
      .eq('id', user.id)
  } else if (!status.connected && profile?.wa_connected) {
    await supabase
      .from('profiles')
      .update({ wa_connected: false })
      .eq('id', user.id)
  }

  return NextResponse.json({ connected: status.connected, number: status.number ?? null })
}
