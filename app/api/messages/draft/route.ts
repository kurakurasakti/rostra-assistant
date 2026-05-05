import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { callAI } from '@/lib/openrouter'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { message: string; brand_voice?: string }
  if (!body.message) return NextResponse.json({ error: 'message required' }, { status: 400 })

  const system = body.brand_voice?.trim()
    ? body.brand_voice.trim()
    : 'Kamu adalah asisten admin toko online Indonesia. Balas pesan pelanggan dengan sopan dan ramah.'

  const draft = await callAI(system, body.message, 300)

  return NextResponse.json({ draft })
}
