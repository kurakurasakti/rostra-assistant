# Phase 3: Dashboard + Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static dashboard with live Supabase data, add trend indicators, pending items, skeleton loading; polish inbox with better bubble styling, micro-interactions, and refined AI draft panel.

**Architecture:** Dashboard stays a client component that queries Supabase for live counts (clients, orders, payments, unread messages) on mount and subscribes to key changes. Inbox is already functional — focus is CSS polish, hover states, and reorganizing the draft panel for better visual hierarchy.

**Tech Stack:** Next.js 16 App Router, shadcn/ui base-nova, Tailwind CSS v4, date-fns (already in deps), lucide-react, supabase-js

---

### Task 1: Dashboard — Live Data Queries + Stat Cards

**Files:**
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Convert to client component with data fetching**

Replace the entire `app/(dashboard)/page.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, ShoppingBag, CreditCard, MessageSquare, ArrowRight, Clock, TrendingUp, TrendingDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardStats {
  totalClients: number
  activeOrders: number
  totalUnpaid: number
  unpaidOrderCount: number
  unreadMessages: number
  clientTrend: number
  orderTrend: number
  unpaidTrend: number
  messageTrend: number
}

interface PendingItem {
  type: "payment" | "appointment"
  title: string
  description: string
  severity: "danger" | "warning"
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)

      // — Counts —
      const [clientRes, orderRes, messagesRes, prevClientRes, prevOrderRes, prevMessageRes] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "aktif"),
        supabase.from("inbox_messages").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "baru").eq("direction", "masuk"),

        // Previous period for trend
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id).lt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "aktif").lt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("inbox_messages").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "baru").eq("direction", "masuk").lt("received_at", thirtyDaysAgo.toISOString()),
      ])

      // — Unpaid payments —
      const { data: unpaidStages } = await supabase
        .from("payment_stages")
        .select("amount, due_date, orders!inner(user_id)")
        .eq("paid", false)
        .eq("orders.user_id", user.id)
        .lte("due_date", today.toISOString().split("T")[0])

      const totalUnpaid = unpaidStages?.reduce((sum, ps) => sum + Number(ps.amount), 0) ?? 0

      // — Pending items —
      const pendings: PendingItem[] = []

      if (unpaidStages && unpaidStages.length > 0) {
        const count = unpaidStages.length
        pendings.push({
          type: "payment",
          title: `${count} pembayaran overdue`,
          description: `Total Rp ${totalUnpaid.toLocaleString("id-ID")}`,
          severity: count > 2 ? "danger" : "warning",
        })
      }

      const { data: todayAppointments } = await supabase
        .from("appointments")
        .select("title, client_id, scheduled_at, clients!inner(name)")
        .eq("clients.user_id", user.id)
        .gte("scheduled_at", today.toISOString().split("T")[0])
        .lt("scheduled_at", new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())

      if (todayAppointments && todayAppointments.length > 0) {
        for (const apt of todayAppointments) {
          const clientName = (apt as unknown as { clients: { name: string } }).clients.name
          const time = new Date(apt.scheduled_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          pendings.push({
            type: "appointment",
            title: `Janji temu: ${clientName}`,
            description: `Pukul ${time}`,
            severity: "warning",
          })
        }
      }

      setPendingItems(pendings)
      setStats({
        totalClients: clientRes.count ?? 0,
        activeOrders: orderRes.count ?? 0,
        totalUnpaid,
        unpaidOrderCount: unpaidStages?.length ?? 0,
        unreadMessages: messagesRes.count ?? 0,
        clientTrend: ((clientRes.count ?? 0) - (prevClientRes.count ?? 0)),
        orderTrend: ((orderRes.count ?? 0) - (prevOrderRes.count ?? 0)),
        unpaidTrend: 0,
        messageTrend: ((messagesRes.count ?? 0) - (prevMessageRes.count ?? 0)),
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: "Total Klien",
      value: stats?.totalClients?.toString() ?? "0",
      icon: Users,
      description: stats?.totalClients ? `${stats.totalClients} klien terdaftar` : "Belum ada klien",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: stats?.clientTrend,
      trendLabel: "30 hari",
    },
    {
      label: "Pesanan Aktif",
      value: stats?.activeOrders?.toString() ?? "0",
      icon: ShoppingBag,
      description: stats?.activeOrders ? `${stats.activeOrders} pesanan berjalan` : "Belum ada pesanan",
      color: "text-primary",
      bg: "bg-primary/10",
      trend: stats?.orderTrend,
      trendLabel: "30 hari",
    },
    {
      label: "Menunggu Bayar",
      value: stats ? `Rp ${stats.totalUnpaid.toLocaleString("id-ID")}` : "Rp 0",
      icon: CreditCard,
      description: stats?.unpaidOrderCount ? `${stats.unpaidOrderCount} pembayaran tertunda` : "Semua pembayaran lunas",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      trend: stats?.unpaidOrderCount,
      trendLabel: "tertunda",
    },
    {
      label: "Pesan Masuk",
      value: stats?.unreadMessages?.toString() ?? "0",
      icon: MessageSquare,
      description: stats?.unreadMessages ? `${stats.unreadMessages} belum dibaca` : "Inbox kosong",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      trend: stats?.messageTrend,
      trendLabel: "30 hari",
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Selamat datang di Rostra. Pantau bisnis kamu dari sini.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, description, color, bg, trend, trendLabel }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </div>
            <div>
              <p className="font-display font-bold text-2xl tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              {trend !== undefined && trend > 0 && (
                <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +{trend} ({trendLabel})
                </p>
              )}
              {trend !== undefined && trend < 0 && (
                <p className="text-xs text-red-600 mt-0.5 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> {trend} ({trendLabel})
                </p>
              )}
              {trend !== undefined && trend === 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">Tidak ada perubahan</p>
              )}
              {label === "Menunggu Bayar" && (
                <p className="text-xs text-muted-foreground mt-0.5">{trendLabel}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Getting started — hide when dashboard has data */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Mulai dengan Rostra</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">3 langkah</span>
          </div>
          <div className="space-y-3">
            {[
              { step: "01", title: "Lengkapi profil bisnis", desc: "Tambahkan nama bisnis dan koneksi WhatsApp", href: "/settings" },
              { step: "02", title: "Tambah klien pertama", desc: "Mulai kelola daftar klien kamu", href: "/clients" },
              { step: "03", title: "Buat pesanan", desc: "Catat pesanan dan atur tahap pembayaran", href: "/clients" },
            ].map(({ step, title, desc, href }) => (
              <a key={step} href={href} className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent transition-colors group">
                <span className="font-display font-bold text-xs text-primary bg-primary/10 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </div>

        {/* Perlu Perhatian */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Perlu Perhatian</h2>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          {pendingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Tidak ada yang perlu diperhatikan</p>
              <p className="text-xs text-muted-foreground mt-1">Pembayaran jatuh tempo dan janji temu akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                  item.severity === "danger" ? "bg-red-500/5 border border-red-500/20" : "bg-amber-500/5 border border-amber-500/20"
                }`}>
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.severity === "danger" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run `npm run build` — verify clean build.

---

### Task 2: Inbox — Polish Conversation List

**Files:**
- Modify: `app/(dashboard)/inbox/page.tsx`

- [ ] **Step 1: Enhance conversation list with richer hover states**

Add subtle background transition, better avatar treatment, and purple active state enhancements. Replace the conversation list button with this:

Replace the conversation button block (lines 297-341) with:

```tsx
            {conversations.map(conv => (
              <button
                key={conv.whatsapp_number}
                onClick={() => {
                  setSelectedNumber(conv.whatsapp_number)
                  setDraft('')
                }}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-border/40',
                  'transition-all duration-150 ease-in-out',
                  'hover:bg-muted/50 hover:pl-5',
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
                  ...
                </div>
              </button>
            ))}
```

Keep the inner content (name, time, status, message preview, badge counts) exactly the same — only change the button wrapper and avatar styling.

- [ ] **Step 2: Build check**

Run `npm run build`.

---

### Task 3: Inbox — Polish Thread Bubbles

**Files:**
- Modify: `app/(dashboard)/inbox/page.tsx`

- [ ] **Step 1: Enhance bubble styling**

Replace the message bubble div block (lines 368-391) with:

```tsx
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
```

Changes: `max-w-[68%]` → `max-w-[72%]`, `rounded-2xl` + `rounded-tr-sm` (softer), add `shadow-sm` to outgoing, add `border border-border/50` to incoming, `mt-1` → `mt-1.5` on timestamp.

- [ ] **Step 2: Add conversation thread spacing**

Change the thread container className from `space-y-2.5` to `space-y-3` (line 359).

- [ ] **Step 3: Build check**

Run `npm run build`.

---

### Task 4: Inbox — Refine AI Draft Panel

**Files:**
- Modify: `app/(dashboard)/inbox/page.tsx`

- [ ] **Step 1: Reorganize draft panel**

Replace the draft panel block (lines 396-469) with:

```tsx
          {/* Draft panel */}
          <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-card">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Balas {selectedConversation.contact_name}
                </span>
              </div>
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Ketik balasan atau muat draft AI..."
                className="resize-none text-[13px] min-h-[72px] bg-background"
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDraft}
                    disabled={loadingDraft}
                    className="h-7 text-[11px] gap-1 text-primary hover:text-primary-foreground hover:bg-primary transition-colors"
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
                    className="h-7 text-[11px] gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Eskalasi
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateStatus('diabaikan')}
                    className="h-7 text-[11px] gap-1 text-muted-foreground"
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
                    className="h-7 text-xs gap-1.5 transition-all duration-150 active:scale-95"
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
```

Changes:
- Background `bg-background` → `bg-card` (draft panel)
- Remove redundant "Balas" header above draft button
- Consolidate action buttons into one row with divider between AI draft and escalation/ignore
- Add `active:scale-95` press feedback on send button
- Cleaner separator and spacing

- [ ] **Step 2: Build check**

Run `npm run build`.

---

### Task 5: Verify & Commit

- [ ] **Step 1: Final build check**

`npm run build` — clean build, no warnings.

- [ ] **Step 2: Quick visual audit**

- Dashboard shows real data (not zeros) when Supabase has data
- Stat cards show trend indicators (green up / red down)
- Skeleton loading state visible during load
- "Perlu Perhatian" shows real overdue payments and today's appointments
- Inbox conversation list: purple active state with left border, hover shifts text left
- Inbox bubbles: rounded-2xl with shadows, better spacing
- Draft panel: cleaner layout with divider, send button press feedback

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/page.tsx app/(dashboard)/inbox/page.tsx
git commit -m "feat: dashboard live data and inbox polish

- Replace hardcoded zero stats with live Supabase queries
- Add trend indicators (up/down arrows with 30-day comparison)
- Show actual pending items (overdue payments, today appointments)
- Skeleton loading states
- Polish inbox conversation list (purple active state, hover transitions)
- Enhance message bubbles (softer radius, shadows, border)
- Refine AI draft panel layout (divider, consolidated actions, press feedback)
"
```
