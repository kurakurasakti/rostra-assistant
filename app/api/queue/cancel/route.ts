import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { queue_id, message_id } = await request.json() as { queue_id: string; message_id?: string }

  if (!queue_id) return NextResponse.json({ error: 'queue_id required' }, { status: 400 })

  await supabase
    .from('send_queue')
    .update({ cancelled: true })
    .eq('id', queue_id)
    .eq('user_id', user.id)

  if (message_id) {
    await supabase
      .from('inbox_messages')
      .update({ status: 'baru' })
      .eq('id', message_id)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
