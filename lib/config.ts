export const IS_BETA = process.env.NEXT_PUBLIC_BETA_MODE === "true"
export const LEVEL2_THRESHOLD = IS_BETA ? 5 : 20
export const LEVEL3_THRESHOLD = IS_BETA ? 20 : 40

// ── Usage quotas (per plan, per calendar month) ─────────────────────────────
// Plan is derived from subscriptions.status in lib/usage.ts (resolvePlan).
// Enforcement dimension is msgs_in; drafts quota is recorded for visibility.
export const PLAN_QUOTAS = {
  free: { msgs_in: 300, drafts: 500 },
  pro: { msgs_in: 3000, drafts: 5000 },
} as const

export type PlanId = keyof typeof PLAN_QUOTAS
