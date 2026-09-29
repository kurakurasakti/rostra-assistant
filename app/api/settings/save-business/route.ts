import { hasEmbeddingKey, type ReindexResult, upsertKnowledgeChunks } from "@/lib/rag"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const REINDEX_TIMEOUT_MS = 25_000

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { raw_text, structured } = await req.json()

  console.log("[save-business] Saving business knowledge for user:", user.id)
  const serviceClient = await createServiceClient()
  const { data: updateData, error } = await serviceClient
    .from("profiles")
    .update({
      business_knowledge_raw: raw_text,
      business_knowledge_structured: structured,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select()

  if (error) {
    console.error("[save-business] Update error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!updateData || updateData.length === 0) {
    console.log("[save-business] Profile missing, inserting for user:", user.id)
    const { error: insertError } = await serviceClient.from("profiles").insert({
      id: user.id,
      business_knowledge_raw: raw_text,
      business_knowledge_structured: structured,
    })
    if (insertError) {
      console.error("[save-business] Insert error:", insertError)
      return Response.json({ error: insertError.message }, { status: 500 })
    }
  } else {
    console.log("[save-business] Successfully saved business knowledge")
  }

  // ── RAG re-indexing (awaited, with timeout guard) ───────────────────────
  // The response reports the reindex outcome so the UI can surface failures
  // instead of showing a false success.
  const { data: freshProfile } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  let reindex: ReindexResult | null = null
  let warning: string | null = null

  if (!freshProfile) {
    warning = "Profil tidak ditemukan untuk re-index — knowledge tersimpan, coba simpan ulang."
  } else if (!hasEmbeddingKey()) {
    warning =
      "Embedding API key belum dikonfigurasi — knowledge tersimpan tapi belum ter-index ke RAG."
  } else {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("reindex timeout")), REINDEX_TIMEOUT_MS),
    )
    try {
      reindex = await Promise.race([upsertKnowledgeChunks(user.id, freshProfile), timeout])
      if (reindex.indexed === 0 && reindex.reused === 0) {
        warning =
          "Semua embedding gagal — knowledge tersimpan tapi index RAG tidak berubah. Coba lagi nanti."
      }
    } catch (err) {
      console.error("[save-business] RAG re-index failed:", err)
      warning =
        "Re-index RAG gagal — knowledge tersimpan, index akan diperbarui saat simpan berikutnya."
    }
  }

  return Response.json({ ok: true, reindex, warning })
}
