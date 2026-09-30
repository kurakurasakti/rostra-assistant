import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

/**
 * Called by the rostra-wa service when a Baileys session connects.
 *
 * This is a server-to-server callback, not a user request, so it is
 * authenticated with the shared webhook secret. It writes through the
 * service-role client (which bypasses RLS) keyed on a caller-supplied
 * userId, so without this check any anonymous caller could flip
 * wa_connected for an arbitrary tenant.
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
  const number = typeof body?.number === "string" ? body.number.trim() : ""
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const supabase = await createServiceClient()

  if (number) {
    // One WA number may only be linked to one account — a second account scanning the
    // same phone would receive that phone's full chat history in its inbox (cross-tenant leak)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, business_name")
      .eq("wa_connected_number", number)
      .neq("id", userId)
      .maybeSingle()

    if (existing) {
      console.error(
        `[connected] REJECTED: number ${number} already linked to profile ${existing.id} (${existing.business_name}) — disconnecting session for ${userId}`,
      )
      const waUrl = process.env.WA_SERVICE_URL?.replace(/\/$/, "")
      if (waUrl) {
        fetch(`${waUrl}/session/${userId}/disconnect`, { method: "POST" }).catch(() => {})
      }
      return NextResponse.json(
        { error: "WhatsApp number already linked to another account" },
        { status: 409 },
      )
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      wa_connected: true,
      onboarding_complete: true,
      ...(number ? { wa_connected_number: number } : {}),
    })
    .eq("id", userId)

  if (error) console.error("[connected] profile update failed:", error)
  else console.log("[connected] profile updated for", userId, number ? `number: ${number}` : "")

  return NextResponse.json({ ok: true })
}
