import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// Called by rostra-wa when a Baileys session disconnects
export async function POST(request: Request) {
  const body = await request.json()
  const { userId, willReconnect } = body
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  // Only mark disconnected if NOT going to auto-reconnect (i.e. logged out)
  if (!willReconnect) {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from("profiles")
      .update({ wa_connected: false, wa_connected_number: null })
      .eq("id", userId)

    if (error) console.error("[disconnected] profile update failed:", error)
    else console.log("[disconnected] wa_connected reset for", userId)
  }

  return NextResponse.json({ ok: true })
}
