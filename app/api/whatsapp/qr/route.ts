import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getQRCode } from '@/lib/whatsapp'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await getQRCode(user.id)
  return NextResponse.json(data)
}
