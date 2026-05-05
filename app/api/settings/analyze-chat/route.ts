import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseWhatsAppExport } from '@/lib/chat-parser'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const text = await file.text()
  const analysis = parseWhatsAppExport(text)

  return NextResponse.json({
    senders: analysis.senders,
    total_messages: analysis.totalMessages,
  })
}
