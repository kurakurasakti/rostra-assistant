import type { FullConfig } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

async function globalTeardown(_config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const userId = process.env.TEST_USER_ID

  if (!supabaseUrl || !supabaseKey || !userId) return

  const supabase = createClient(supabaseUrl, supabaseKey)

  await supabase.from("scheduled_messages").delete().eq("user_id", userId)
  await supabase.from("inbox_messages").delete().eq("user_id", userId)
  await supabase.from("security_logs").delete().eq("user_id", userId)
  await supabase.from("notifications").delete().eq("user_id", userId)
  await supabase.from("ai_feedback").delete().eq("user_id", userId)
  await supabase.from("orders").delete().eq("user_id", userId)
  await supabase.from("clients").delete().eq("user_id", userId)
  await supabase.from("profiles").delete().eq("id", userId)
  await supabase.auth.admin.deleteUser(userId)
}

export default globalTeardown
