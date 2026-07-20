import { NextResponse } from "next/server"
import { parseWhatsAppExport } from "@/lib/chat-parser"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await request.formData()
  const files = formData.getAll("files") as File[]
  if (!files.length) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const texts = await Promise.all(files.map((f) => f.text()))
  const combined = texts.join("\n")
  const analysis = parseWhatsAppExport(combined)

  return NextResponse.json({
    senders: analysis.senders,
    total_messages: analysis.totalMessages,
  })
}
