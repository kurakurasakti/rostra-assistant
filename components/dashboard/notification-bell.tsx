'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, MessageSquare } from 'lucide-react'
import { Popover } from '@base-ui/react/popover'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'eskalasi' | 'injection'
  title: string
  body: string | null
  read: boolean
  link: string | null
  created_at: string
}

interface NotificationBellProps {
  variant?: 'sidebar' | 'mobile'
}

export function NotificationBell({ variant = 'sidebar' }: NotificationBellProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const fetchUnread = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('read', false)
    setUnreadCount(count ?? 0)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      fetchUnread(user.id)
    })
  }, [fetchUnread])

  useEffect(() => {
    if (!userId) return
    const onFocus = () => fetchUnread(userId)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [userId, fetchUnread])

  async function handleOpenChange(isOpen: boolean) {
    if (!isOpen || !userId) return

    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    setNotifications((data as Notification[]) ?? [])
    setLoading(false)

    if (unreadCount > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  function handleNotificationClick(notif: Notification) {
    if (notif.link) router.push(notif.link)
  }

  const isMobile = variant === 'mobile'

  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Popover.Trigger
        className={cn(
          'relative transition-colors active:scale-[0.97]',
          isMobile
            ? 'flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-muted-foreground hover:text-foreground'
            : 'flex items-center gap-3 px-2 lg:px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground w-full justify-center lg:justify-start',
        )}
        title="Notifikasi"
      >
        <span className="relative flex-shrink-0">
          <Bell className={cn(isMobile ? 'w-5 h-5' : 'w-4 h-4')} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-0.5 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        {isMobile
          ? <span className="text-[10px] font-medium leading-none">Notif</span>
          : <span className="hidden lg:inline">Notifikasi</span>
        }
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side={isMobile ? 'top' : 'right'}
          align={isMobile ? 'end' : 'end'}
          sideOffset={isMobile ? 4 : 8}
        >
          <Popover.Popup
            className={cn(
              'z-50 w-80 rounded-xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none overflow-hidden',
              'origin-(--transform-origin)',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'duration-150',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold font-display">Notifikasi</p>
              {notifications.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {notifications.filter(n => !n.read).length === 0
                    ? 'Semua sudah dibaca'
                    : `${notifications.filter(n => !n.read).length} belum dibaca`}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <Bell className="w-7 h-7 text-muted-foreground/25" />
                  <p className="text-xs text-muted-foreground">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif, i) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex gap-3 items-start',
                        'transition-colors hover:bg-accent/60',
                        !notif.read && 'bg-primary/5',
                      )}
                      style={{
                        animation: 'notif-item-in 220ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
                        animationDelay: `${i * 30}ms`,
                      }}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                        notif.type === 'injection'
                          ? 'bg-destructive/15'
                          : 'bg-amber-500/15',
                      )}>
                        {notif.type === 'injection'
                          ? <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          : <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        }
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-xs font-medium leading-snug',
                          notif.read ? 'text-muted-foreground' : 'text-foreground',
                        )}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                            {notif.body}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                            locale: idLocale,
                          })}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notif.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
