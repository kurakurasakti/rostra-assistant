import { type NextRequest, NextResponse } from "next/server"
import { checkIsAdmin } from "@/lib/auth/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ isAdmin: false })
    }

    const isAdmin = await checkIsAdmin(user)
    return NextResponse.json({ isAdmin, email: user.email })
  } catch (error) {
    console.error("[api/admin/check] Error:", error)
    return NextResponse.json({ isAdmin: false }, { status: 200 })
  }
}
