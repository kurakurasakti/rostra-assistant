import { createServiceClient } from "@/lib/supabase/server"

/**
 * Check if an email matches the configured admin email allowlist
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false

  const adminEnv =
    process.env.ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    ""

  const adminList = adminEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (adminList.length > 0) {
    return adminList.includes(email.trim().toLowerCase())
  }

  // Fallback: If no ADMIN_EMAILS configured in beta, fallback to false
  return false
}

/**
 * Check if a user is admin via database flag OR email allowlist
 */
export async function checkIsAdmin(user: {
  id: string
  email?: string | null
}): Promise<boolean> {
  // 1. Check email allowlist first (fastest)
  if (isEmailAdmin(user.email)) {
    return true
  }

  // 2. Check profile database flag
  try {
    const supabase = await createServiceClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.is_admin === true) {
      return true
    }
  } catch (err) {
    console.error("[checkIsAdmin] Error checking profile:", err)
  }

  return false
}

/**
 * Server-side guard helper for API routes
 */
export async function requireAdminUser(user: {
  id: string
  email?: string | null
} | null): Promise<{ authorized: boolean; reason?: string }> {
  if (!user) {
    return { authorized: false, reason: "Unauthorized: Silakan login terlebih dahulu" }
  }

  const isAdmin = await checkIsAdmin(user)
  if (!isAdmin) {
    return { authorized: false, reason: "Forbidden: Halaman ini khusus untuk Admin Glim" }
  }

  return { authorized: true }
}
