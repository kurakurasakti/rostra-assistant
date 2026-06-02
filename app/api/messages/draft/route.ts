import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { draftReply, buildAIContext } from '@/lib/openrouter'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    message: string
    brand_voice?: string
    client_id?: string
    history?: Array<{ direction: string; message_body: string }>
    hint?: string
  }
  if (!body.message) return NextResponse.json({ error: 'message required' }, { status: 400 })

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Fetch client if provided
  let client = null
  if (body.client_id) {
    const { data: c } = await supabase
      .from('clients')
      .select('*')
      .eq('id', body.client_id)
      .eq('user_id', user.id)
      .single()
    client = c
  }

  // Build full AI context with client order info
  const systemPrompt = await buildAIContext(profile, client, user.id)

  const { draft, usage } = await draftReply(body.message, body.brand_voice ?? '', body.history, systemPrompt, body.hint)

  return NextResponse.json({ draft, usage })
}
