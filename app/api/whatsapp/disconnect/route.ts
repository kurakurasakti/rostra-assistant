import { NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/api-handler"
import { createClient } from "@/lib/supabase/server"

async function handlePOST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const waUrl = process.env.WA_SERVICE_URL?.replace(/\/$/, "")
  if (waUrl) {
    await fetch(`${waUrl}/session/${user.id}/disconnect`, { method: "POST" }).catch((err) => console.error("[whatsapp/disconnect] background task failed:", err))
  }

  await supabase
    .from("profiles")
    .update({ wa_connected: false, onboarding_complete: false })
    .eq("id", user.id)

  return NextResponse.json({ ok: true })
}

export const POST = withErrorHandler("POST /api/whatsapp/disconnect", handlePOST)
