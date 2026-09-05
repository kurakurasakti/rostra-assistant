import { redirect } from "next/navigation"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Sidebar } from "@/components/dashboard/sidebar"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import { Toaster } from "@/components/ui/sonner"
import { checkIsAdmin } from "@/lib/auth/admin"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_wizard_seen_at, is_admin")
    .eq("id", user.id)
    .maybeSingle()

  const isAdmin = await checkIsAdmin(user)
  const showWizard = !profile?.onboarding_wizard_seen_at

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <MobileNav isAdmin={isAdmin} />
      <Toaster />
      <OnboardingWizard initialOpen={showWizard} />
    </div>
  )
}
