import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const { userId } = await req.json()

  const supabase = createServiceClient()
  await supabase
    .from('profiles')
    .update({
      wa_connected: true,
      onboarding_complete: true
    })
    .eq('id', userId)

  return NextResponse.json({ ok: true })
}
