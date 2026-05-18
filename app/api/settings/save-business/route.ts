import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { raw_text, structured } = await req.json()

  const { error } = await supabase
    .from('profiles')
    .update({
      business_knowledge_raw: raw_text,
      business_knowledge_structured: structured,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
