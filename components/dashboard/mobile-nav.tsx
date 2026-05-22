'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Upload,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Klien', icon: Users },
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Setelan', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-sidebar/95 backdrop-blur-sm flex items-center px-2">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors duration-150',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive ? 'text-accent' : '')} />
            <span className={cn(
              'text-[10px] font-medium leading-none',
              isActive ? 'text-primary' : ''
            )}>
              {label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-t-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
