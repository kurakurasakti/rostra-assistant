import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Called by rostra-wa service when a Baileys session connects
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { userId, number } = body
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      wa_connected: true,
      onboarding_complete: true,
      ...(number ? { wa_connected_number: number } : {}),
    })
    .eq('id', userId)

  if (error) console.error('[connected] profile update failed:', error)
  else console.log('[connected] profile updated for', userId, number ? `number: ${number}` : '')

  return NextResponse.json({ ok: true })
}
