import { createClient } from '@/lib/supabase/server'
import { extractBusinessKnowledge } from '@/lib/openrouter'
import { calculateCompleteness } from '@/lib/business-knowledge'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { raw_text } = await req.json()

  if (!raw_text?.trim() || raw_text.trim().length < 20) {
    return Response.json(
      { error: 'Deskripsi terlalu singkat. Ceritakan lebih detail.' },
      { status: 400 },
    )
  }

  const structured = await extractBusinessKnowledge(raw_text)
  const completeness = calculateCompleteness(structured)

  return Response.json({ structured, completeness })
}
