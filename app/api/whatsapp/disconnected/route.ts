import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId, willReconnect } = await request.json()

  const supabase = createServiceClient()
  await supabase
    .from('profiles')
    .update({ wa_connected: false })
    .eq('id', userId)

  return NextResponse.json({ ok: true })
}
