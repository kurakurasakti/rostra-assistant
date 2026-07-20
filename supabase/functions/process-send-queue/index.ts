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

    const { data: items, error } = await supabase
      .from("send_queue")
      .select("id, user_id, message_id, to_number, message")
      .eq("cancelled", false)
      .eq("sent", false)
      .lte("send_at", new Date().toISOString())
      .limit(BATCH_SIZE)

    if (error) {
      console.error("[send-queue] fetch error:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return Response.json({ processed: 0, sent: 0, failed: 0 })
    }

    // Batch-fetch wa_connected for all unique users
    const userIds = [...new Set(items.map((i) => i.user_id))]
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, wa_connected")
      .in("id", userIds)
    const connectedUsers = new Set(
      (profilesData ?? []).filter((p) => p.wa_connected).map((p) => p.id),
    )

    let sent = 0
    let failed = 0

    for (const item of items) {
      if (!connectedUsers.has(item.user_id)) {
        await supabase.from("send_queue").update({ cancelled: true }).eq("id", item.id)
        failed++
        continue
      }

      try {
        const res = await fetch(`${waServiceUrl}/session/${item.user_id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: item.to_number, message: item.message }),
        })

        if (res.ok) {
          await Promise.all([
            supabase.from("send_queue").update({ sent: true }).eq("id", item.id),
            supabase.from("inbox_messages").insert({
              user_id: item.user_id,
              direction: "keluar",
              whatsapp_number: item.to_number,
              message_body: item.message,
              classification: "rutin",
              status: "dibalas",
            }),
            item.message_id
              ? supabase
                  .from("inbox_messages")
                  .update({ status: "dibalas", replied_at: new Date().toISOString() })
                  .eq("id", item.message_id)
              : Promise.resolve(),
          ])
          sent++
        } else {
          const text = await res.text()
          console.error(`[send-queue] WA error ${res.status}: ${text.slice(0, 200)}`)
          failed++
        }
      } catch (err) {
        console.error("[send-queue] send error:", err)
        failed++
      }
    }

    console.log(`[send-queue] processed=${items.length} sent=${sent} failed=${failed}`)
    return Response.json({ processed: items.length, sent, failed })
  } catch (err) {
    console.error("[send-queue] unhandled:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
})
