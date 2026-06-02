'use client'

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react'
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
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

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
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [hint, setHint] = useState('')
  const [originalAiDraft, setOriginalAiDraft] = useState<string | null>(null)
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')
  const threadEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .order('received_at', { ascending: true })
    if (!error && data) setMessages(data)
    setLoadingMessages(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedNumber, messages.length])

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
  const thread = selectedConversation?.messages ?? []
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

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

  async function handleSend() {
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
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Gagal mengirim pesan')
        return
      }
      const wasCorrected = originalAiDraft && originalAiDraft.trim() !== draft.trim()
      setDraft('')
      setOriginalAiDraft(null)
      setHint('')
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
                onClick={() => {
                  setSelectedNumber(conv.whatsapp_number)
                  setDraft('')
                  setHint('')
                  setOriginalAiDraft(null)
                  setMobileView('thread')
                }}
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
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
                    <p className="whitespace-pre-wrap text-[13px]">{msg.message_body}</p>
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
                    onClick={handleSend}
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
    </div>
  )
}
