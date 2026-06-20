'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/dashboard/notification-bell'
import { Logo } from '@/components/logo'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Klien', icon: Users },
  { href: '/inbox', label: 'Kotak Masuk', icon: MessageSquare },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <aside className="hidden md:flex w-16 lg:w-60 flex-shrink-0 border-r border-border bg-sidebar flex-col h-screen transition-all duration-200">
      {/* Logo */}
      <div className="px-3 lg:px-5 py-5 border-b border-border flex justify-center lg:justify-start">
        <Logo variant="mark" className="lg:hidden" height={28} />
        <Logo
          variant="lockup"
          tone={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
          className="hidden lg:block"
          height={26}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 lg:px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                'flex items-center gap-3 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                'justify-center lg:justify-start',
                isActive
                  ? 'bg-primary/10 text-primary lg:border-l-2 lg:border-accent lg:pl-[10px]'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
              )}
            >
              <Icon suppressHydrationWarning className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-accent' : '')} />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 lg:px-3 py-4 border-t border-border space-y-0.5">
        <NotificationBell />
        <button
          onClick={toggleTheme}
          title={mounted && resolvedTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          className="flex items-center gap-3 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground w-full transition-colors justify-center lg:justify-start"
        >
          {mounted && resolvedTheme === 'dark' ? (
            <>
              <Sun suppressHydrationWarning className="w-4 h-4 flex-shrink-0" />
              <span className="hidden lg:inline">Mode Terang</span>
            </>
          ) : (
            <>
              <Moon suppressHydrationWarning className="w-4 h-4 flex-shrink-0" />
              <span className="hidden lg:inline">Mode Gelap</span>
            </>
          )}
        </button>

        <button
          onClick={handleLogout}
          title="Keluar"
          className="flex items-center gap-3 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors justify-center lg:justify-start"
        >
          <LogOut suppressHydrationWarning className="w-4 h-4 flex-shrink-0" />
          <span className="hidden lg:inline">Keluar</span>
        </button>
      </div>
    </aside>
  )
}
