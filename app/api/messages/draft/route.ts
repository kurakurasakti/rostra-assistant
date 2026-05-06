import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { draftReply } from '@/lib/openrouter'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    message: string
    brand_voice?: string
    history?: Array<{ direction: string; message_body: string }>
  }
  if (!body.message) return NextResponse.json({ error: 'message required' }, { status: 400 })

  let brandVoice = body.brand_voice ?? ''
  if (!brandVoice) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('brand_voice')
      .eq('id', user.id)
      .single()
    brandVoice = profile?.brand_voice ?? ''
  }

  const draft = await draftReply(body.message, brandVoice, body.history)

  return NextResponse.json({ draft })
}
