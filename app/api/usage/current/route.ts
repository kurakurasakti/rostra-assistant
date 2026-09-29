import { NextResponse } from "next/server"
import { PLAN_QUOTAS } from "@/lib/config"
import { createClient } from "@/lib/supabase/server"
import { checkQuota, currentMonthKey } from "@/lib/usage"

/**
 * GET /api/usage/current
 *
 * Current month's usage vs plan quota for the authenticated user.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const check = await checkQuota(user.id)
  const limits = PLAN_QUOTAS[check.plan]

  return NextResponse.json({
    plan: check.plan,
    month: currentMonthKey(),
    msgs_in: check.usage.msgs_in,
    msgs_limit: limits.msgs_in,
    usage_pct: Math.round(check.usagePct * 100),
    allowed: check.allowed,
    drafts: check.usage.drafts,
    drafts_limit: limits.drafts,
    auto_sent: check.usage.auto_sent,
  })
}
