import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseWhatsAppExport, extractBusinessMessages, extractConversationContext, extractQAPairs, selectBestExamples } from '@/lib/chat-parser'
import { analyzeBrandVoice } from '@/lib/openrouter'
import type { QACategory } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { sender: string; file_content: string }
  if (!body.sender || !body.file_content) {
    return NextResponse.json({ error: 'sender and file_content required' }, { status: 400 })
  }

  const analysis = parseWhatsAppExport(body.file_content)
  const messages = extractBusinessMessages(analysis, body.sender)

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages found for selected sender' }, { status: 400 })
  }

  const conversationContext = extractConversationContext(analysis, body.sender)
  const brandVoice = await analyzeBrandVoice(messages, conversationContext)

  // Extract few-shot examples from full parsed conversation (both sides)
  const rawPairs = extractQAPairs(analysis.messages, body.sender)
  const examples = selectBestExamples(rawPairs)

  // Save brand_voice + conversation_examples
  await supabase
    .from('profiles')
    .update({
      brand_voice: brandVoice,
      conversation_examples: examples,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  const examplesByCategory = examples.reduce<Record<string, number>>((acc, ex) => {
    acc[ex.category] = (acc[ex.category] ?? 0) + 1
    return acc
  }, {} as Record<QACategory, number>)

  return NextResponse.json({
    brand_voice: brandVoice,
    message_count: messages.length,
    examples_count: examples.length,
    examples_by_category: examplesByCategory,
  })
}
