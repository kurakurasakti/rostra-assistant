import { PLAN_QUOTAS, type PlanId } from "@/lib/config"
import { createServiceClient } from "@/lib/supabase/server"

export interface UsageCounters {
  msgs_in?: number
  drafts?: number
  auto_sent?: number
  embed_calls?: number
  tokens_in?: number
  tokens_out?: number
}

export interface UsageSnapshot {
  msgs_in: number
  drafts: number
  auto_sent: number
  embed_calls: number
  llm_tokens_in: number
  llm_tokens_out: number
  warned_80: boolean
  quota_notified_at: string | null
}

const EMPTY_SNAPSHOT: UsageSnapshot = {
  msgs_in: 0,
  drafts: 0,
  auto_sent: 0,
  embed_calls: 0,
  llm_tokens_in: 0,
  llm_tokens_out: 0,
  warned_80: false,
  quota_notified_at: null,
}

export interface QuotaCheck {
  allowed: boolean
  usagePct: number
  plan: PlanId
  usage: UsageSnapshot
}

/** YYYY-MM-DD of the first day of the current month (matches usage_monthly.month). */
export function currentMonthKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}

/**
 * Derive the effective plan from a subscriptions row.
 * 'active' | 'trialing' → pro, anything else (incl. no row) → free.
 */
export function resolvePlan(
  subscription: { status: string; plan_id: string } | null | undefined,
): PlanId {
  if (!subscription) return "free"
  if (subscription.status === "active" || subscription.status === "trialing") return "pro"
  return "free"
}

/** Pure quota math — enforced dimension is msgs_in. Exported for tests. */
export function evaluateQuota(msgsIn: number, plan: PlanId): { allowed: boolean; usagePct: number } {
  const limit = PLAN_QUOTAS[plan].msgs_in
  if (limit <= 0) return { allowed: false, usagePct: 1 }
  return { allowed: msgsIn < limit, usagePct: msgsIn / limit }
}

/**
 * Fire-and-forget usage tracking via the increment_usage RPC.
 * Never throws — metering must never break the message flow.
 */
export async function trackUsage(userId: string, counters: UsageCounters): Promise<void> {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.rpc("increment_usage", {
      p_user_id: userId,
      p_msgs_in: counters.msgs_in ?? 0,
      p_drafts: counters.drafts ?? 0,
      p_auto_sent: counters.auto_sent ?? 0,
      p_embed_calls: counters.embed_calls ?? 0,
      p_tokens_in: counters.tokens_in ?? 0,
      p_tokens_out: counters.tokens_out ?? 0,
    })
    if (error) console.warn("[usage] increment_usage RPC error:", error)
  } catch (err) {
    console.warn("[usage] trackUsage failed (non-fatal):", err)
  }
}

/**
 * Check whether the user still has quota for incoming messages.
 * Fail-open: on any error returns allowed=true so metering outages
 * never block customer messages.
 */
export async function checkQuota(userId: string): Promise<QuotaCheck> {
  const fallback: QuotaCheck = { allowed: true, usagePct: 0, plan: "free", usage: EMPTY_SNAPSHOT }
  try {
    const supabase = await createServiceClient()
    const month = currentMonthKey()
    const [{ data: usage }, { data: sub }] = await Promise.all([
      supabase
        .from("usage_monthly")
        .select(
          "msgs_in, drafts, auto_sent, embed_calls, llm_tokens_in, llm_tokens_out, warned_80, quota_notified_at",
        )
        .eq("user_id", userId)
        .eq("month", month)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, plan_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ])

    const plan = resolvePlan(
      sub as { status: string; plan_id: string } | null | undefined,
    )
    const snapshot: UsageSnapshot = usage
      ? {
          msgs_in: usage.msgs_in ?? 0,
          drafts: usage.drafts ?? 0,
          auto_sent: usage.auto_sent ?? 0,
          embed_calls: usage.embed_calls ?? 0,
          llm_tokens_in: usage.llm_tokens_in ?? 0,
          llm_tokens_out: usage.llm_tokens_out ?? 0,
          warned_80: usage.warned_80 ?? false,
          quota_notified_at: usage.quota_notified_at ?? null,
        }
      : EMPTY_SNAPSHOT

    const { allowed, usagePct } = evaluateQuota(snapshot.msgs_in, plan)
    return { allowed, usagePct, plan, usage: snapshot }
  } catch (err) {
    console.warn("[usage] checkQuota failed, failing open:", err)
    return fallback
  }
}

/** YYYY-MM-DD in server-local time (for quota_notified_at dedup). */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Send the 80% soft warning once per month. Never throws.
 */
export async function maybeWarn80Percent(
  userId: string,
  check: QuotaCheck,
  notify: (title: string, body: string) => Promise<void>,
): Promise<void> {
  try {
    if (check.usagePct < 0.8 || check.usage.warned_80) return
    const limit = PLAN_QUOTAS[check.plan].msgs_in
    await notify(
      "Penggunaan hampir habis",
      `Bulan ini sudah ${check.usage.msgs_in} dari ${limit} pesan (${Math.round(check.usagePct * 100)}%). AI akan berhenti otomatis saat kuota habis.`,
    )
    const supabase = await createServiceClient()
    await supabase
      .from("usage_monthly")
      .update({ warned_80: true })
      .eq("user_id", userId)
      .eq("month", currentMonthKey())
  } catch (err) {
    console.warn("[usage] maybeWarn80Percent failed (non-fatal):", err)
  }
}

/**
 * Returns true if the quota-exhausted notice still needs to be sent today.
 * Marks quota_notified_at= сегодня when sending. Never throws.
 */
export async function shouldNotifyQuotaToday(userId: string, lastNotified: string | null): Promise<boolean> {
  try {
    const today = todayKey()
    if (lastNotified === today) return false
    const supabase = await createServiceClient()
    await supabase
      .from("usage_monthly")
      .update({ quota_notified_at: today })
      .eq("user_id", userId)
      .eq("month", currentMonthKey())
    return true
  } catch (err) {
    console.warn("[usage] shouldNotifyQuotaToday failed (non-fatal):", err)
    return false
  }
}
