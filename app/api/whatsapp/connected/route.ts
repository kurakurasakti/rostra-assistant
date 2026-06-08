import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId } = await request.json()

  const supabase = await createServiceClient()
  await supabase
    .from('profiles')
    .update({
      wa_connected: true,
      onboarding_complete: true,
    })
    .eq('id', userId)

  return NextResponse.json({ ok: true })
}
