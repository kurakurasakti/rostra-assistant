import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateScheduledMessages } from '@/lib/scheduler'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { order_id: string }
  if (!body.order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const [orderRes, profileRes, templatesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('*, payment_stages(*), appointments(*), clients(*)')
      .eq('id', body.order_id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', user.id),
  ])

  if (!orderRes.data || !profileRes.data) {
    return NextResponse.json({ error: 'Order or profile not found' }, { status: 404 })
  }

  const { payment_stages: stages, appointments, clients: client, ...order } = orderRes.data

  const messages = generateScheduledMessages(
    order,
    client,
    profileRes.data,
    stages ?? [],
    appointments ?? [],
    templatesRes.data ?? [],
  )

  if (messages.length === 0) {
    return NextResponse.json({ count: 0, messages: [] })
  }

  const { data: inserted, error } = await supabase
    .from('scheduled_messages')
    .insert(messages)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ count: inserted?.length ?? 0, messages: inserted })
}
