import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

/**
 * Called by the rostra-wa service when a Baileys session disconnects.
 * Server-to-server callback authenticated with the shared webhook
 * secret — see the matching note in /api/whatsapp/connected.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.WEBHOOK_SECRET ?? ""
  const sig = request.headers.get("x-webhook-secret") ?? ""

  if (!secret.length) return false
  if (sig.length !== secret.length) return false

  return timingSafeEqual(Buffer.from(sig), Buffer.from(secret))
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === "string" ? body.userId.trim() : ""
  const willReconnect = body?.willReconnect === true
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
