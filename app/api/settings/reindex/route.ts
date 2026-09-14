/**
 * POST /api/settings/reindex
 *
 * Manually trigger a full RAG re-index for the authenticated user.
 * Useful after editing conversation examples or brand voice, which don't
 * go through the save-business route.
 *
 * Returns: { indexed: number, skipped: number }
 */
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { upsertKnowledgeChunks, getChunkCount } from "@/lib/rag"

export async function POST(_req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const serviceClient = await createServiceClient()
  const { data: profile, error: profileErr } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileErr || !profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 })
  }

  try {
    const result = await upsertKnowledgeChunks(user.id, profile)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[reindex] failed:", err)
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function GET(_req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const count = await getChunkCount(user.id)
  return Response.json({ chunk_count: count })
}
