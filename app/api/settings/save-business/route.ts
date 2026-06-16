import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { raw_text, structured } = await req.json()

  console.log('[save-business] Saving business knowledge for user:', user.id)
  const serviceClient = await createServiceClient()
  const { data: updateData, error } = await serviceClient
    .from('profiles')
    .update({
      business_knowledge_raw: raw_text,
      business_knowledge_structured: structured,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()

  if (error) {
    console.error('[save-business] Update error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!updateData || updateData.length === 0) {
    console.log('[save-business] Profile missing, inserting for user:', user.id)
    const { error: insertError } = await serviceClient
      .from('profiles')
      .insert({
        id: user.id,
        business_knowledge_raw: raw_text,
        business_knowledge_structured: structured,
      })
    if (insertError) {
      console.error('[save-business] Insert error:', insertError)
      return Response.json({ error: insertError.message }, { status: 500 })
    }
  } else {
    console.log('[save-business] Successfully saved business knowledge')
  }

  return Response.json({ ok: true })
}
