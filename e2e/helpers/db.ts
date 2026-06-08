import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const db = createClient(supabaseUrl, supabaseKey);

export async function getScheduledMessages(userId: string) {
  const { data, error } = await db
    .from("scheduled_messages")
    .select("type, scheduled_at, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}

export async function getInboxMessage(userId: string, whatsappNumber: string) {
  const { data, error } = await db
    .from("inbox_messages")
    .select("id, classification, status, ai_draft_reply, message_body")
    .eq("user_id", userId)
    .eq("whatsapp_number", whatsappNumber)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getSecurityLog(userId: string) {
  const { data, error } = await db
    .from("security_logs")
    .select("threat_type, whatsapp_number")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getNotification(userId: string) {
  const { data, error } = await db
    .from("notifications")
    .select("type, title")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getAIFeedback(userId: string) {
  const { data, error } = await db
    .from("ai_feedback")
    .select("original, corrected")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getProfile(userId: string) {
  const { data, error } = await db
    .from("profiles")
    .select("feedback_count")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getClientByPhone(whatsappNumber: string) {
  const { data, error } = await db
    .from("clients")
    .select("user_id")
    .eq("whatsapp_number", whatsappNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteTestUser(userId: string) {
  await db.from("scheduled_messages").delete().eq("user_id", userId);
  await db.from("inbox_messages").delete().eq("user_id", userId);
  await db.from("security_logs").delete().eq("user_id", userId);
  await db.from("notifications").delete().eq("user_id", userId);
  await db.from("ai_feedback").delete().eq("user_id", userId);
  await db.from("orders").delete().eq("user_id", userId);
  await db.from("clients").delete().eq("user_id", userId);
  await db.from("profiles").delete().eq("id", userId);
  await db.auth.admin.deleteUser(userId);
}
