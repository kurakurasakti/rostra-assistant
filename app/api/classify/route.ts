import { NextResponse } from "next/server"
import { classifyMessage } from "@/lib/openrouter"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as { message_id?: string; message_body: string }
  if (!body.message_body)
    return NextResponse.json({ error: "message_body required" }, { status: 400 })

  const classification = await classifyMessage(body.message_body)

  if (body.message_id) {
    await supabase
      .from("inbox_messages")
      .update({ classification })
      .eq("id", body.message_id)
      .eq("user_id", user.id)
  }

  return NextResponse.json({ classification })
}
