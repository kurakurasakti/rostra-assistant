import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseWhatsAppExport, extractBusinessMessages, extractConversationContext } from '@/lib/chat-parser'
import { analyzeBrandVoice } from '@/lib/openrouter'

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

  return NextResponse.json({ brand_voice: brandVoice, message_count: messages.length })
}
