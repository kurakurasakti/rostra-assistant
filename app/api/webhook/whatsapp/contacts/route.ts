import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { normalizeWANumber } from "@/lib/whatsapp"

export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET ?? ""
  const sig = request.headers.get("x-webhook-secret") ?? ""

  const authorized =
    secret.length > 0 &&
    sig.length === secret.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(secret))

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const contacts = Array.isArray(body?.contacts) ? body.contacts : []
  console.log("[webhook/contacts] received contacts update:", {
    userId: String(body?.userId ?? "").slice(0, 8) + "...",
    count: contacts.length,
  })

  // Process asynchronously
  processContacts(body).catch((err) => console.error("[webhook/contacts] processing error:", err))

  return NextResponse.json({ ok: true }, { status: 200 })
}

async function processContacts(payload: any) {
  const userId = String(payload.userId ?? "").trim()
  const rawContacts: { jid: string; name: string }[] = Array.isArray(payload.contacts)
    ? payload.contacts
    : []

  if (!userId || rawContacts.length === 0) return

  const supabase = await createServiceClient()

  // 1. Filter and normalize contacts
  const validContacts = rawContacts
    .map((c) => {
      const normalized = normalizeWANumber(c.jid ?? "")
      const name = String(c.name ?? "").trim()

      // Ignore names that look like number/jid
      const isInvalidName = !name || name.includes("@") || /^\+?\d+$/.test(name)

      if (!normalized || isInvalidName) return null
      return { whatsapp_number: normalized, name }
    })
    .filter(Boolean) as { whatsapp_number: string; name: string }[]

  if (validContacts.length === 0) return

  // Deduplicate incoming list by whatsapp_number
  const uniqueContactsMap = new Map<string, string>()
  for (const c of validContacts) {
    uniqueContactsMap.set(c.whatsapp_number, c.name)
  }

  const uniqueNumbers = Array.from(uniqueContactsMap.keys())

  // 2. Fetch existing clients for these numbers
  const { data: existingClients } = await supabase
    .from("clients")
    .select("id, whatsapp_number, name")
    .eq("user_id", userId)
    .in("whatsapp_number", uniqueNumbers)

  const existingNumbers = new Set<string>()
  const existingClientsToUpdate: { id: string; name: string }[] = []

  if (existingClients) {
    for (const client of existingClients) {
      existingNumbers.add(client.whatsapp_number)

      // If the existing name has changed
      const newName = uniqueContactsMap.get(client.whatsapp_number)
      if (newName && client.name !== newName) {
        existingClientsToUpdate.push({ id: client.id, name: newName })
      }
    }
  }

  // 3. Perform Updates on existing clients
  if (existingClientsToUpdate.length > 0) {
    console.log(
      `[webhook/contacts] updating ${existingClientsToUpdate.length} existing client names`,
    )
    for (const update of existingClientsToUpdate) {
      await supabase.from("clients").update({ name: update.name }).eq("id", update.id)
    }
  }

  // 4. Update inbox messages sender names and link to existing clients (do not auto-create new clients)
  const { data: allClients } = await supabase
    .from("clients")
    .select("id, whatsapp_number, name")
    .eq("user_id", userId)
    .in("whatsapp_number", uniqueNumbers)

  const clientMap = new Map<string, { id: string; name: string }>()
  if (allClients) {
    for (const client of allClients) {
      clientMap.set(client.whatsapp_number, client)
    }
  }

  console.log(
    `[webhook/contacts] updating sender_name and client_id in inbox_messages for ${uniqueNumbers.length} numbers`,
  )
  for (const [number, name] of uniqueContactsMap.entries()) {
    const client = clientMap.get(number)
    await supabase
      .from("inbox_messages")
      .update({
        sender_name: client ? client.name : name,
        client_id: client ? client.id : null,
      })
      .eq("user_id", userId)
      .eq("whatsapp_number", number)
  }
}
