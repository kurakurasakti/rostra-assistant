'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { InboxMessage } from '@/types'
import { format, isToday, isYesterday } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Sparkles,
  Send,
  AlertTriangle,
  EyeOff,
  Loader2,
  RefreshCw,
  ChevronLeft,
  RotateCcw,
  ChevronsUp,
  FileText,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

const PAGE_SIZE = 10

interface Conversation {
  whatsapp_number: string
  contact_name: string
  last_message: InboxMessage
  unread_count: number
  messages: InboxMessage[]
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Kemarin'
  return format(d, 'dd/MM', { locale: idLocale })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

function ClassificationBadge({ value }: { value: string }) {
  if (value === 'rutin')
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[10px] px-1.5 py-0 h-4">
        Rutin
      </Badge>
    )
  if (value === 'sensitif')
    return (
      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px] px-1.5 py-0 h-4">
        Sensitif
      </Badge>
    )
  if (value === 'injection_attempt')
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
        <AlertTriangle className="w-2.5 h-2.5" />
        Percobaan Manipulasi
      </Badge>
    )
  return null
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    baru: 'bg-orange-500',
    dibalas: 'bg-green-500',
    diabaikan: 'bg-gray-400',
    dieskalasi: 'bg-red-500',
  }
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', colors[status] ?? 'bg-gray-300')}
      title={status}
    />
  )
}

function buildConversations(messages: InboxMessage[]): Conversation[] {
  const map: Record<string, Conversation> = {}

  for (const msg of messages) {
    const key = msg.whatsapp_number
    if (!map[key]) {
      map[key] = {
        whatsapp_number: key,
        contact_name: msg.sender_name ?? key,
        last_message: msg,
        unread_count: 0,
        messages: [],
      }
    }
    map[key].messages.push(msg)
    if (new Date(msg.received_at) >= new Date(map[key].last_message.received_at)) {
      map[key].last_message = msg
    }
    if (msg.direction === 'masuk' && msg.status === 'baru') {
      map[key].unread_count++
    }
    if (msg.direction === 'masuk' && msg.sender_name && map[key].contact_name === key) {
      map[key].contact_name = msg.sender_name
    }
  }

  return Object.values(map).sort(
    (a, b) =>
      new Date(b.last_message.received_at).getTime() -
      new Date(a.last_message.received_at).getTime(),
  )
}

export default function InboxPage() {
  const supabase = createClient()

  // Sidebar state — drives conversation list
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)

  // Thread pagination state
  const [threadMessages, setThreadMessages] = useState<InboxMessage[]>([])
  const [threadCursor, setThreadCursor] = useState<string | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  // On-demand history backfill ("+5 more") once local DB pagination is exhausted
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [historyExhausted, setHistoryExhausted] = useState(false)

  // Other state
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [hint, setHint] = useState('')
  const [originalAiDraft, setOriginalAiDraft] = useState<string | null>(null)
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  // Level 2 queue state
  const [queuedEntry, setQueuedEntry] = useState<{ queue_id: string; message_id: string; send_at: string } | null>(null)
  const [queueCountdown, setQueueCountdown] = useState<number>(0)
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Refs
  const threadEndRef = useRef<HTMLDivElement>(null)
  const threadScrollRef = useRef<HTMLDivElement>(null)
  // Stable ref so realtime handler never captures stale selectedNumber
  const selectedNumberRef = useRef<string | null>(null)
  // Snapshot taken before prepending older messages — restored in useLayoutEffect
  const scrollRestoreRef = useRef<{ prevHeight: number; prevTop: number } | null>(null)
  // Signals useLayoutEffect to scroll to bottom after the next threadMessages update
  const pendingScrollBottomRef = useRef(false)

  useEffect(() => {
    selectedNumberRef.current = selectedNumber
  }, [selectedNumber])

  // Runs synchronously after DOM mutations — handles both scroll-restore (load more)
  // and scroll-to-bottom (initial load / new message)
  useLayoutEffect(() => {
    if (scrollRestoreRef.current && threadScrollRef.current) {
      const { prevHeight, prevTop } = scrollRestoreRef.current
      const diff = threadScrollRef.current.scrollHeight - prevHeight
      threadScrollRef.current.scrollTop = prevTop + diff
      scrollRestoreRef.current = null
      pendingScrollBottomRef.current = false
      return
    }
    if (pendingScrollBottomRef.current && threadScrollRef.current && !loadingThread) {
      pendingScrollBottomRef.current = false
      if (threadMessages.length > 0) {
        threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight
      }
    }
  }, [threadMessages, loadingThread])

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .order('received_at', { ascending: true })
    if (!error && data) setMessages(data)
    setLoadingMessages(false)
  }, [])

  const loadThread = useCallback(async (waNumber: string) => {
    setLoadingThread(true)
    setThreadMessages([])
    setThreadCursor(null)
    setHasMoreMessages(false)
    setFetchingHistory(false)
    setHistoryExhausted(false)
    pendingScrollBottomRef.current = true

    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('whatsapp_number', waNumber)
      .order('received_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (!error && data) {
      const msgs = [...data].reverse()
      setThreadMessages(msgs)
      if (msgs.length > 0) setThreadCursor(msgs[0].received_at)
      setHasMoreMessages(data.length === PAGE_SIZE)
    }
    setLoadingThread(false)
  }, [])

  const loadMoreMessages = useCallback(async () => {
    if (!selectedNumberRef.current || !threadCursor || loadingMore || !hasMoreMessages) return

    const container = threadScrollRef.current
    if (container) {
      scrollRestoreRef.current = {
        prevHeight: container.scrollHeight,
        prevTop: container.scrollTop,
      }
    }

    setLoadingMore(true)

    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('whatsapp_number', selectedNumberRef.current)
      .lt('received_at', threadCursor)
      .order('received_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (!error && data && data.length > 0) {
      const olderMsgs = [...data].reverse()
      setHasMoreMessages(data.length === PAGE_SIZE)
      setThreadCursor(olderMsgs[0].received_at)
      setThreadMessages(prev => [...olderMsgs, ...prev])
    } else {
      setHasMoreMessages(false)
      scrollRestoreRef.current = null
    }

    setLoadingMore(false)
  }, [threadCursor, loadingMore, hasMoreMessages])

  // Local DB pagination exhausted — ask wa-service to pull more from WhatsApp itself,
  // forward into inbox_messages, then re-query so the UI stays DB-sourced
  const fetchOlderHistory = useCallback(async () => {
    const waNumber = selectedNumberRef.current
    if (!waNumber || fetchingHistory || historyExhausted || threadMessages.length === 0) return

    const oldest = threadMessages[0]
    if (!oldest.wa_message_id) {
      setHistoryExhausted(true)
      return
    }
    setFetchingHistory(true)

    try {
      const res = await fetch('/api/messages/fetch-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_number: waNumber,
          oldest_message_id: oldest.wa_message_id,
          oldest_from_me: oldest.direction === 'keluar',
          oldest_received_at: oldest.received_at,
        }),
      })
      const result = await res.json().catch(() => ({}))

      if (!res.ok || !result?.count) {
        setHistoryExhausted(true)
        return
      }

      const container = threadScrollRef.current
      if (container) {
        scrollRestoreRef.current = {
          prevHeight: container.scrollHeight,
          prevTop: container.scrollTop,
        }
      }

      const { data, error } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('whatsapp_number', waNumber)
        .lt('received_at', oldest.received_at)
        .order('received_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (!error && data && data.length > 0) {
        const olderMsgs = [...data].reverse()
        setThreadCursor(olderMsgs[0].received_at)
        setHasMoreMessages(data.length === PAGE_SIZE)
        setThreadMessages(prev => [...olderMsgs, ...prev])
      } else {
        scrollRestoreRef.current = null
        setHistoryExhausted(true)
      }
    } catch {
      setHistoryExhausted(true)
    } finally {
      setFetchingHistory(false)
    }
  }, [fetchingHistory, historyExhausted, threadMessages])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    loadMessages()
  }, [loadMessages])

  // Trigger load more when user scrolls to within 80px of the top
  useEffect(() => {
    const container = threadScrollRef.current
    if (!container) return
    const handleScroll = () => {
      if (container.scrollTop >= 80) return
      if (hasMoreMessages && !loadingMore) {
        loadMoreMessages()
      } else if (!hasMoreMessages && !historyExhausted && !fetchingHistory && !loadingMore) {
        fetchOlderHistory()
      }
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMoreMessages, loadingMore, loadMoreMessages, historyExhausted, fetchingHistory, fetchOlderHistory])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_messages',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const newMsg = payload.new as InboxMessage
          setMessages(prev => [...prev, newMsg])
          if (selectedNumberRef.current === newMsg.whatsapp_number) {
            pendingScrollBottomRef.current = true
            setThreadMessages(prev => [...prev, newMsg])
          }
          setNewMessageIds(prev => new Set([...prev, newMsg.id]))
          setTimeout(() => {
            setNewMessageIds(prev => {
              const next = new Set(prev)
              next.delete(newMsg.id)
              return next
            })
          }, 400)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inbox_messages',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          setMessages(prev =>
            prev.map(m => (m.id === payload.new.id ? (payload.new as InboxMessage) : m)),
          )
          setThreadMessages(prev =>
            prev.map(m => (m.id === payload.new.id ? (payload.new as InboxMessage) : m)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const conversations = buildConversations(messages)
  const selectedConversation = selectedNumber
    ? conversations.find(c => c.whatsapp_number === selectedNumber)
    : null
  const thread = threadMessages
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  function selectConversation(waNumber: string) {
    setSelectedNumber(waNumber)
    setDraft('')
    setHint('')
    setOriginalAiDraft(null)
    setMobileView('thread')
    loadThread(waNumber)
  }

  async function handleGenerateDraft(withHint?: string) {
    if (!selectedConversation) return
    const lastIncoming = [...thread].reverse().find(m => m.direction === 'masuk')
    if (!lastIncoming) {
      toast.error('Tidak ada pesan masuk untuk di-draft')
      return
    }
    setLoadingDraft(true)
    try {
      const res = await fetch('/api/messages/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastIncoming.message_body,
          history: thread.map(m => ({ direction: m.direction, message_body: m.message_body })),
          hint: withHint ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.flagged) {
        toast.error('AI tidak bisa membuat draft untuk pesan ini. Silakan balas manual.')
        setDraft('')
        setOriginalAiDraft(null)
        return
      }
      const newDraft = data.draft ?? ''
      setDraft(newDraft)
      if (!withHint) setOriginalAiDraft(newDraft)
      setHint('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat draft AI')
    } finally {
      setLoadingDraft(false)
    }
  }

  async function handleSend(forceSend = false) {
    if (!selectedNumber || !draft.trim()) return
    setSending(true)
    try {
      const lastIncoming = [...thread].reverse().find(m => m.direction === 'masuk')
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_number: selectedNumber,
          message: draft.trim(),
          reply_to_id: lastIncoming?.id,
          force_send: forceSend || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Gagal mengirim pesan')
        return
      }
      const data = await res.json()
      if (data.queued) {
        // Level 2 semi-auto: start countdown
        const messageId = lastIncoming?.id ?? ''
        setQueuedEntry({ queue_id: data.queue_id, message_id: messageId, send_at: data.send_at })
        const secondsLeft = Math.round((new Date(data.send_at).getTime() - Date.now()) / 1000)
        setQueueCountdown(secondsLeft)
        if (queueTimerRef.current) clearInterval(queueTimerRef.current)
        queueTimerRef.current = setInterval(() => {
          setQueueCountdown(prev => {
            if (prev <= 1) {
              if (queueTimerRef.current) clearInterval(queueTimerRef.current)
              setQueuedEntry(null)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        setDraft('')
        setOriginalAiDraft(null)
        setHint('')
        toast.info('AI akan membalas otomatis dalam 5 menit')
        return
      }
      const wasCorrected = originalAiDraft && originalAiDraft.trim() !== draft.trim()
      setDraft('')
      setOriginalAiDraft(null)
      setHint('')
      if (queueTimerRef.current) clearInterval(queueTimerRef.current)
      setQueuedEntry(null)
      if (wasCorrected) {
        toast.success('Pesan terkirim · Koreksi dicatat untuk tingkatkan AI ✓')
      } else {
        toast.success('Pesan terkirim')
      }
    } catch {
      toast.error('Gagal mengirim pesan')
    } finally {
      setSending(false)
    }
  }

  async function handleCancelQueue() {
    if (!queuedEntry) return
    try {
      await fetch('/api/queue/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queuedEntry.queue_id, message_id: queuedEntry.message_id }),
      })
      if (queueTimerRef.current) clearInterval(queueTimerRef.current)
      setQueuedEntry(null)
      setQueueCountdown(0)
      toast.success('Pengiriman otomatis dibatalkan')
    } catch {
      toast.error('Gagal membatalkan')
    }
  }

  async function handleSendNow() {
    if (!queuedEntry || !selectedNumber) return
    // Cancel queue entry then send immediately
    await fetch('/api/queue/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: queuedEntry.queue_id }),
    })
    if (queueTimerRef.current) clearInterval(queueTimerRef.current)
    setQueuedEntry(null)
    setQueueCountdown(0)
    // Re-fetch the queued message from thread to send immediately
    const queueMsg = thread.find(m => m.id === queuedEntry.message_id)
    const msgBody = queueMsg?.ai_draft_reply ?? draft
    if (!msgBody) return
    setSending(true)
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_number: selectedNumber,
          message: msgBody,
          reply_to_id: queuedEntry.message_id,
          force_send: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Gagal mengirim pesan')
        return
      }
      toast.success('Pesan terkirim sekarang')
    } catch {
      toast.error('Gagal mengirim pesan')
    } finally {
      setSending(false)
    }
  }

  async function handleUpdateStatus(status: 'diabaikan' | 'dieskalasi') {
    const lastIncoming = thread
      .filter(m => m.direction === 'masuk' && m.status === 'baru')
      .at(-1)
    if (!lastIncoming) {
      toast.error('Tidak ada pesan baru untuk diperbarui')
      return
    }
    const { error } = await supabase
      .from('inbox_messages')
      .update({ status })
      .eq('id', lastIncoming.id)
    if (error) {
      toast.error('Gagal memperbarui status')
    } else {
      toast.success(status === 'diabaikan' ? 'Pesan diabaikan' : 'Pesan dieskalasi ke manusia')
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation list */}
      <div className={cn(
        'flex-shrink-0 border-r border-border flex flex-col',
        'w-full md:w-[240px] lg:w-[300px]',
        mobileView === 'thread' ? 'hidden md:flex' : 'flex',
      )}>
        <div className="px-4 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-sm">Kotak Masuk</h1>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-[10px] h-5 px-1.5">
                  {totalUnread}
                </Badge>
              )}
              <button
                onClick={loadMessages}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingMessages ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-border/40">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <Skeleton className="h-2.5 w-20" />
                      <Skeleton className="h-2.5 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
              <MessageSquare className="w-8 h-8 opacity-20" />
              <p className="text-xs text-center">Belum ada pesan masuk</p>
            </div>
          ) : (
            conversations.map((conv, i) => (
              <button
                key={conv.whatsapp_number}
                style={{ '--stagger-i': i } as CSSProperties}
                onClick={() => selectConversation(conv.whatsapp_number)}
                className={cn(
                  'animate-stagger-item w-full text-left px-4 py-3 border-b border-border/40',
                  'transition-colors duration-150 ease-out',
                  'hover:bg-muted/50',
                  selectedNumber === conv.whatsapp_number &&
                    'bg-primary/[0.04] border-l-[3px] border-l-primary shadow-[inset_0_0_0_1px_rgba(124,58,237,0.08)]',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-colors duration-150',
                    selectedNumber === conv.whatsapp_number
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-primary',
                  )}>
                    {getInitials(conv.contact_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-xs truncate">{conv.contact_name}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatTime(conv.last_message.received_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot status={conv.last_message.status} />
                      <p className="text-[11px] text-muted-foreground truncate flex-1">
                        {conv.last_message.direction === 'keluar' && (
                          <span className="text-primary/80">Kamu: </span>
                        )}
                        {conv.last_message.message_body}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] flex items-center justify-center font-medium">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <ClassificationBadge value={conv.last_message.classification} />
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread + draft panel */}
      {selectedConversation ? (
        <div className={cn(
          'flex-1 flex flex-col min-h-0 overflow-hidden',
          mobileView === 'list' ? 'hidden md:flex' : 'flex',
        )}>
          {/* Thread header */}
          <div className="px-4 md:px-5 py-3 border-b border-border flex-shrink-0 flex items-center gap-3">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{selectedConversation.contact_name}</p>
              <p className="text-xs text-muted-foreground truncate">{selectedConversation.whatsapp_number}</p>
            </div>
            <ClassificationBadge value={selectedConversation.last_message.classification} />
          </div>

          {/* Messages */}
          <div ref={threadScrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

            {/* Top area: loading spinner, load-more button, or end-of-history label */}
            {loadingThread ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {hasMoreMessages ? (
                  <div className="flex justify-center pb-1">
                    {loadingMore ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Memuat pesan sebelumnya...
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMoreMessages}
                        disabled={loadingMore}
                        className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronsUp className="w-3 h-3" />
                        Muat pesan sebelumnya
                      </Button>
                    )}
                  </div>
                ) : thread.length > 0 ? (
                  <p className="text-center text-[10px] text-muted-foreground/50 py-1 select-none">
                    Semua riwayat percakapan sudah ditampilkan
                  </p>
                ) : null}

                {/* Empty conversation */}
                {thread.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 opacity-20" />
                    <p className="text-xs">Belum ada pesan dalam percakapan ini</p>
                  </div>
                )}
              </>
            )}

            {/* Message bubbles */}
            {thread.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.direction === 'keluar' ? 'justify-end' : 'justify-start',
                  newMessageIds.has(msg.id) && 'animate-enter',
                )}
              >
                <div
                  className={cn(
                    'max-w-[72%] px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.direction === 'keluar'
                      ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-sm'
                      : 'bg-muted/80 text-foreground rounded-2xl rounded-tl-sm border border-border/50',
                  )}
                >
                  {/* Image media */}
                  {msg.media_type === 'image' && msg.media_url && (
                    <div className="mb-1.5">
                      <img
                        src={msg.media_url}
                        alt="Foto"
                        className="rounded-xl cursor-pointer object-cover max-w-[200px] max-h-[200px] w-full block"
                        onClick={() => setLightboxUrl(msg.media_url!)}
                        onError={e => {
                          const el = e.target as HTMLImageElement
                          el.style.display = 'none'
                          el.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      <p className="hidden text-[11px] text-muted-foreground italic py-1">Gambar tidak dapat dimuat</p>
                      <p className="text-[10px] text-muted-foreground mt-1">📷 Foto</p>
                    </div>
                  )}

                  {/* Document media */}
                  {msg.media_type === 'document' && msg.media_url && (
                    <a
                      href={msg.media_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 mb-1.5 text-[12px] underline underline-offset-2"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      {decodeURIComponent(msg.media_url.split('/').pop() ?? 'Dokumen')}
                    </a>
                  )}

                  {/* Audio indicator */}
                  {msg.media_type === 'audio' && (
                    <p className="text-[12px] italic mb-1">🎵 Pesan suara</p>
                  )}

                  {/* Text / caption — hide placeholder if media already shown */}
                  {(!msg.media_type || msg.message_body !== '[Foto]' && msg.message_body !== '[Dokumen]' && msg.message_body !== '[Audio]') && (
                    <p className="whitespace-pre-wrap text-[13px]">{msg.message_body}</p>
                  )}

                  <p className={cn(
                    'text-[10px] mt-1.5',
                    msg.direction === 'keluar'
                      ? 'text-primary-foreground/60 text-right'
                      : 'text-muted-foreground',
                  )}>
                    {format(new Date(msg.received_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>

          {/* Draft panel */}
          <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-card">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Balas {selectedConversation.contact_name}
                </span>
                <span className={cn(
                  'text-[10px] text-amber-600 font-medium transition-opacity duration-200',
                  originalAiDraft && draft !== originalAiDraft ? 'opacity-100' : 'opacity-0',
                )}>
                  Mengedit draft AI
                </span>
              </div>
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Ketik balasan atau muat draft AI..."
                className="resize-none text-[13px] min-h-[72px] bg-background disabled:opacity-60 disabled:cursor-wait"
                rows={3}
                disabled={loadingDraft}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              {/* Hint input — fades in only after first draft is loaded */}
              <div className={cn(
                'overflow-hidden transition-all duration-200 ease-out',
                originalAiDraft !== null ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
              )}>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Input
                    value={hint}
                    onChange={e => setHint(e.target.value)}
                    placeholder="Petunjuk: lebih singkat, tambah harga..."
                    className="h-7 text-[11px] bg-background flex-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && hint.trim()) {
                        e.preventDefault()
                        handleGenerateDraft(hint.trim())
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateDraft(hint.trim())}
                    disabled={loadingDraft || !hint.trim()}
                    className="h-7 text-[11px] gap-1 flex-shrink-0 transition-transform duration-100 active:scale-95"
                  >
                    {loadingDraft ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    Regenerasi
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateDraft()}
                    disabled={loadingDraft}
                    className="h-7 text-[11px] gap-1 text-primary hover:text-primary-foreground hover:bg-primary transition-colors active:scale-95"
                  >
                    {loadingDraft ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    Muat Draft AI
                  </Button>
                  <div className="w-px h-4 bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateStatus('dieskalasi')}
                    className="h-7 text-[11px] gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-transform duration-100 active:scale-95"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Eskalasi
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateStatus('diabaikan')}
                    className="h-7 text-[11px] gap-1 text-muted-foreground transition-transform duration-100 active:scale-95"
                  >
                    <EyeOff className="w-3 h-3" />
                    Abaikan
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    Ctrl+Enter
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleSend()}
                    disabled={sending || !draft.trim()}
                    className="h-7 text-xs gap-1.5 transition-transform duration-150 ease-out active:scale-95"
                  >
                    {sending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    Kirim
                  </Button>
                </div>
              </div>

              {/* Level 2 queue countdown banner */}
              {queuedEntry && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-amber-500/10 border-t border-amber-500/20 rounded-b-xl">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    AI membalas otomatis dalam <span className="font-semibold tabular-nums">{Math.floor(queueCountdown / 60)}:{String(queueCountdown % 60).padStart(2, '0')}</span>
                  </p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-amber-300" onClick={handleCancelQueue}>
                      Batalkan
                    </Button>
                    <Button size="sm" className="h-6 text-[10px] px-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSendNow}>
                      Kirim Sekarang
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={cn(
          'flex-1 items-center justify-center',
          mobileView === 'list' ? 'hidden md:flex' : 'flex',
        )}>
          <div className="text-center text-muted-foreground space-y-3">
            <MessageSquare className="w-12 h-12 mx-auto opacity-15" />
            <div>
              <p className="text-sm font-medium">Pilih percakapan</p>
              <p className="text-xs mt-1 opacity-70">Pesan masuk via WhatsApp muncul di sini</p>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative flex flex-col gap-3 max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt="Foto"
              className="max-h-[80vh] w-full object-contain rounded-xl"
            />
            <div className="flex items-center justify-between">
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white/70 hover:text-white underline"
              >
                Buka di tab baru ↗
              </a>
              <button
                onClick={() => setLightboxUrl(null)}
                className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
