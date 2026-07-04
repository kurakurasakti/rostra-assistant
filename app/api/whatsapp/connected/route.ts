import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Called by rostra-wa service when a Baileys session connects
export async function POST(request: Request) {
  const body = await request.json()
  const { userId, number } = body
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const supabase = await createServiceClient()

  if (number) {
    // One WA number may only be linked to one account — a second account scanning the
    // same phone would receive that phone's full chat history in its inbox (cross-tenant leak)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, business_name')
      .eq('wa_connected_number', number)
      .neq('id', userId)
      .maybeSingle()

    if (existing) {
      console.error(
        `[connected] REJECTED: number ${number} already linked to profile ${existing.id} (${existing.business_name}) — disconnecting session for ${userId}`,
      )
      const waUrl = process.env.WA_SERVICE_URL?.replace(/\/$/, '')
      if (waUrl) {
        fetch(`${waUrl}/session/${userId}/disconnect`, { method: 'POST' }).catch(() => {})
      }
      return NextResponse.json(
        { error: 'WhatsApp number already linked to another account' },
        { status: 409 },
      )
    }
  }

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
