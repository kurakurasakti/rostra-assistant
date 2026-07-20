import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BATCH_SIZE = 50

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const waServiceUrl = Deno.env.get("WA_SERVICE_URL")
    if (!waServiceUrl) {
      return Response.json({ error: "WA_SERVICE_URL not set" }, { status: 500 })
    }

    const { data: messages, error } = await supabase
      .from("scheduled_messages")
      .select("id, user_id, whatsapp_number, message_body")
      .eq("status", "menunggu")
      .lte("scheduled_at", new Date().toISOString())
      .limit(BATCH_SIZE)

    if (error) {
      console.error("[scheduler] fetch error:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return Response.json({ processed: 0, sent: 0, failed: 0, skipped: 0 })
    }

    // Batch-fetch wa_connected for all unique users
    const userIds = [...new Set(messages.map((m) => m.user_id))]
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, wa_connected")
      .in("id", userIds)
    const connectedUsers = new Set(
      (profilesData ?? []).filter((p) => p.wa_connected).map((p) => p.id),
    )

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const msg of messages) {
      if (!connectedUsers.has(msg.user_id)) {
        await supabase
          .from("scheduled_messages")
          .update({ status: "gagal", error_message: "WA not connected" })
          .eq("id", msg.id)
        skipped++
        continue
      }

      try {
        const res = await fetch(`${waServiceUrl}/session/${msg.user_id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: msg.whatsapp_number, message: msg.message_body }),
        })

        if (res.ok) {
          await supabase
            .from("scheduled_messages")
            .update({ status: "terkirim", sent_at: new Date().toISOString() })
            .eq("id", msg.id)
          sent++
        } else {
          const text = await res.text()
          await supabase
            .from("scheduled_messages")
            .update({
              status: "gagal",
              error_message: `WA error ${res.status}: ${text.slice(0, 200)}`,
            })
            .eq("id", msg.id)
          failed++
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        await supabase
          .from("scheduled_messages")
          .update({ status: "gagal", error_message: errMsg.slice(0, 200) })
          .eq("id", msg.id)
        failed++
      }
    }

    console.log(
      `[scheduler] processed=${messages.length} sent=${sent} failed=${failed} skipped=${skipped}`,
    )
    return Response.json({ processed: messages.length, sent, failed, skipped })
  } catch (err) {
    console.error("[scheduler] unhandled error:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
})
