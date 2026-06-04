import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/whatsapp'
import { categorizeQAPair } from '@/lib/chat-parser'
import { LEVEL2_THRESHOLD } from '@/lib/config'
import type { ConversationExample, QACategory } from '@/types'

const CATEGORY_QUOTA: Record<QACategory, number> = {
  harga: 3, jadwal: 3, ketersediaan: 2, status: 2, pembayaran: 2, umum: 2,
}

async function updateConversationExamples(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  customerMessage: string,
  correctedReply: string,
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('conversation_examples')
    .eq('id', userId)
    .single()

  const examples: ConversationExample[] = Array.isArray(profile?.conversation_examples)
    ? profile.conversation_examples
    : []

  const category = categorizeQAPair(customerMessage, correctedReply)
  const newExample: ConversationExample = {
    category,
    customer: customerMessage,
    admin: correctedReply,
    source: 'correction',
    used_count: 0,
    created_at: new Date().toISOString(),
  }

  const categoryExamples = examples.filter(e => e.category === category)
  const quota = CATEGORY_QUOTA[category]

  let updated: ConversationExample[]
  if (categoryExamples.length < quota) {
    updated = [...examples, newExample]
  } else {
    // Replace example with lowest used_count in this category
    const minUsed = Math.min(...categoryExamples.map(e => e.used_count))
    const replaceIdx = examples.findIndex(
      e => e.category === category && e.used_count === minUsed,
    )
    updated = [...examples]
    updated[replaceIdx] = newExample
  }

  await supabase
    .from('profiles')
    .update({ conversation_examples: updated })
    .eq('id', userId)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    whatsapp_number: string
    message: string
    reply_to_id?: string
    force_send?: boolean  // bypass queue when user clicks "Kirim Sekarang"
  }

  if (!body.whatsapp_number || !body.message) {
    return NextResponse.json({ error: 'whatsapp_number and message required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('wa_connected, auto_reply_level, feedback_count')
    .eq('id', user.id)
    .single()

  if (!profile?.wa_connected) {
    return NextResponse.json({ error: 'WhatsApp belum terhubung' }, { status: 400 })
  }

  // Level 2 semi-auto: queue rutin messages with 5-min delay unless force_send=true
  const isLevel2 = (profile.auto_reply_level ?? 1) >= 2 && (profile.feedback_count ?? 0) >= LEVEL2_THRESHOLD
  if (isLevel2 && !body.force_send && body.reply_to_id) {
    const { data: incoming } = await supabase
      .from('inbox_messages')
      .select('classification')
      .eq('id', body.reply_to_id)
      .single()

    if (incoming?.classification === 'rutin') {
      const sendAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      const { data: queued } = await supabase
        .from('send_queue')
        .insert({
          user_id: user.id,
          message_id: body.reply_to_id,
          to_number: body.whatsapp_number,
          message: body.message,
          send_at: sendAt,
        })
        .select('id')
        .single()

      await supabase
        .from('inbox_messages')
        .update({ status: 'antri', ai_draft_reply: body.message })
        .eq('id', body.reply_to_id)
        .eq('user_id', user.id)

      return NextResponse.json({ queued: true, send_at: sendAt, queue_id: queued?.id })
    }
  }

  try {
    await sendTextMessage(body.whatsapp_number, body.message, user.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'WA service error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Save outgoing message to inbox
  await supabase.from('inbox_messages').insert({
    user_id: user.id,
    direction: 'keluar',
    whatsapp_number: body.whatsapp_number,
    message_body: body.message,
    classification: 'rutin',
    status: 'dibalas',
  })

  // Mark incoming message as replied
  if (body.reply_to_id) {
    await supabase
      .from('inbox_messages')
      .update({ status: 'dibalas', replied_at: new Date().toISOString() })
      .eq('id', body.reply_to_id)
      .eq('user_id', user.id)

    // Feedback loop: if sent text differs from ai_draft_reply → record correction
    const { data: original } = await supabase
      .from('inbox_messages')
      .select('ai_draft_reply, message_body')
      .eq('id', body.reply_to_id)
      .eq('user_id', user.id)
      .single()

    const originalDraft = original?.ai_draft_reply
    const originalIncoming = original?.message_body ?? ''
    const sentMessage = body.message.trim()

    if (originalDraft && originalDraft.trim() !== sentMessage) {
      await Promise.all([
        supabase.from('ai_feedback').insert({
          user_id: user.id,
          message_id: body.reply_to_id,
          original: originalDraft,
          corrected: sentMessage,
        }),
        supabase.rpc('increment_feedback_count', { uid: user.id }),
      ])

      // Update conversation_examples with this correction (fire-and-forget)
      if (originalIncoming.trim()) {
        updateConversationExamples(supabase, user.id, originalIncoming, sentMessage).catch(() => {})
      }

      // Every 10 corrections → re-analyze brand voice from feedback patterns (fire-and-forget)
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('feedback_count')
        .eq('id', user.id)
        .single()

      if (updatedProfile && updatedProfile.feedback_count > 0 && updatedProfile.feedback_count % 10 === 0) {
        import('@/lib/openrouter').then(({ reanalyzeBrandVoice }) => {
          reanalyzeBrandVoice(user.id).catch(() => {})
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true })
}
