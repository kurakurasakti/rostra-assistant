import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows, error } = await supabase
    .from("inbox_messages")
    .select("id, media_url")
    .lt("received_at", cutoff)
    .not("media_url", "is", null)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!rows?.length) {
    return new Response(JSON.stringify({ deleted: 0, message: "No old media to clean up" }))
  }

  let deleted = 0
  let failed = 0

  for (const row of rows) {
    // Extract storage path from public URL
    // Format: https://{ref}.supabase.co/storage/v1/object/public/chat-media/{path}
    const match = row.media_url?.match(/\/object\/public\/chat-media\/(.+)$/)
    if (!match?.[1]) continue

    const storagePath = match[1]
    const { error: removeError } = await supabase.storage.from("chat-media").remove([storagePath])

    if (removeError) {
      console.error(`Failed to delete ${storagePath}:`, removeError.message)
      failed++
      continue
    }

    await supabase.from("inbox_messages").update({ media_url: null }).eq("id", row.id)

    deleted++
  }

  return new Response(JSON.stringify({ deleted, failed, total: rows.length }), {
    headers: { "Content-Type": "application/json" },
  })
})
