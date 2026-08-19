"use client"

import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  MessageSquare,
  Plus,
  Radio,
  Send,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wand2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type CSSProperties, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface DashboardStats {
  totalClients: number
  activeOrders: number
  totalUnpaid: number
  unpaidOrderCount: number
  unreadMessages: number
  clientTrend: number
  orderTrend: number
  messageTrend: number
}

interface PendingItem {
  type: "payment" | "appointment"
  title: string
  description: string
  severity: "danger" | "warning"
  clientPhone?: string
  clientName?: string
  amount?: number
}

interface RecentMessage {
  id: string
  whatsapp_number: string
  contact_name: string | null
  message_body: string
  received_at: string
  classification: string
}

interface RecentClient {
  id: string
  name: string
  whatsapp_number: string
  created_at: string
  latest_order_status: string | null
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 4 && hour < 11) return "Selamat Pagi"
  if (hour >= 11 && hour < 15) return "Selamat Siang"
  if (hour >= 15 && hour < 18) return "Selamat Sore"
  return "Selamat Malam"
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [businessName, setBusinessName] = useState<string>("")
  const [waConnected, setWaConnected] = useState<boolean>(false)
  const [waPhoneNumber, setWaPhoneNumber] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState<{
    wa: boolean
    clients: boolean
    orders: boolean
  } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [
        profileRes,
        clientRes,
        orderRes,
        messagesRes,
        allOrdersRes,
        prevClientRes,
        prevOrderRes,
        prevMessageRes,
        clientsListRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("wa_connected, business_name, notification_wa_number")
          .eq("id", user.id)
          .single(),
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "aktif"),
        supabase
          .from("inbox_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "baru")
          .eq("direction", "masuk"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .lt("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "aktif")
          .lt("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("inbox_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "baru")
          .eq("direction", "masuk")
          .lt("received_at", thirtyDaysAgo.toISOString()),
        supabase.from("clients").select("id, name, whatsapp_number").eq("user_id", user.id),
      ])

      let isConnected = profileRes.data?.wa_connected ?? false
      let bName = profileRes.data?.business_name ?? ""
      const waNumber = profileRes.data?.notification_wa_number ?? ""

      if (profileRes.error && profileRes.error.code === "PGRST116") {
        const { data: insertedData, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            business_name: "",
            brand_voice: "Ramah, profesional, dan informatif",
          })
          .select("wa_connected, business_name")
          .single()
        if (!insertError && insertedData) {
          isConnected = insertedData.wa_connected
          bName = insertedData.business_name ?? ""
        }
      }

      setWaConnected(isConnected)
      setBusinessName(bName)
      setWaPhoneNumber(waNumber)

      // Map client numbers to names
      const phoneToNameMap: Record<string, string> = {}
      for (const cl of clientsListRes.data ?? []) {
        if (cl.whatsapp_number) {
          const raw = cl.whatsapp_number.replace(/\D/g, "")
          phoneToNameMap[raw] = cl.name
          if (raw.startsWith("62")) {
            phoneToNameMap[`0${raw.slice(2)}`] = cl.name
          }
        }
      }

      // Fetch unpaid stages
      const { data: unpaidStages } = await supabase
        .from("payment_stages")
        .select("amount, due_date, name, orders!inner(user_id, client_id, clients!inner(name, whatsapp_number))")
        .eq("paid", false)
        .eq("orders.user_id", user.id)
        .lte("due_date", today.toISOString().split("T")[0])

      const totalUnpaid = unpaidStages?.reduce((sum, ps) => sum + Number(ps.amount), 0) ?? 0
      const pendings: PendingItem[] = []

      if (unpaidStages && unpaidStages.length > 0) {
        for (const ps of unpaidStages) {
          const clientInfo = (
            ps as unknown as {
              orders: {
                clients: { name: string; whatsapp_number: string }
              }
            }
          ).orders?.clients

          pendings.push({
            type: "payment",
            title: `Tagihan Overdue: ${clientInfo?.name ?? "Klien"}`,
            description: `${ps.name || "Tahap Pembayaran"} • Rp ${Number(ps.amount).toLocaleString("id-ID")}`,
            severity: "danger",
            clientName: clientInfo?.name,
            clientPhone: clientInfo?.whatsapp_number,
            amount: Number(ps.amount),
          })
        }
      }

      // Fetch appointments for today
      const { data: todayAppointments } = await supabase
        .from("appointments")
        .select("title, client_id, scheduled_at, clients!inner(name, whatsapp_number)")
        .eq("clients.user_id", user.id)
        .gte("scheduled_at", today.toISOString().split("T")[0])
        .lt("scheduled_at", new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())

      if (todayAppointments && todayAppointments.length > 0) {
        for (const apt of todayAppointments) {
          const clientObj = (apt as unknown as { clients: { name: string; whatsapp_number: string } }).clients
          const time = new Date(apt.scheduled_at).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })
          pendings.push({
            type: "appointment",
            title: `Janji Temu: ${clientObj?.name ?? "Klien"}`,
            description: `${apt.title || "Konsultasi"} • Pukul ${time}`,
            severity: "warning",
            clientName: clientObj?.name,
            clientPhone: clientObj?.whatsapp_number,
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
        clientTrend: (clientRes.count ?? 0) - (prevClientRes.count ?? 0),
        orderTrend: (orderRes.count ?? 0) - (prevOrderRes.count ?? 0),
        messageTrend: (messagesRes.count ?? 0) - (prevMessageRes.count ?? 0),
      })
      setOnboarding({
        wa: isConnected,
        clients: (clientRes.count ?? 0) > 0,
        orders: (allOrdersRes.count ?? 0) > 0,
      })

      // Fetch recent messages
      const { data: recentMsgs } = await supabase
        .from("inbox_messages")
        .select("id, whatsapp_number, message_body, received_at, classification")
        .eq("user_id", user.id)
        .eq("status", "baru")
        .eq("direction", "masuk")
        .order("received_at", { ascending: false })
        .limit(5)

      setRecentMessages(
        (recentMsgs ?? []).map((msg) => {
          const rawNum = msg.whatsapp_number.replace(/\D/g, "")
          const matchedName =
            phoneToNameMap[rawNum] ||
            (rawNum.startsWith("62") ? phoneToNameMap[`0${rawNum.slice(2)}`] : null)
          return {
            ...msg,
            contact_name: matchedName ?? null,
          }
        }),
      )

      // Fetch recent clients
      const { data: recentCl } = await supabase
        .from("clients")
        .select("id, name, whatsapp_number, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (recentCl && recentCl.length > 0) {
        const clientIds = recentCl.map((c) => c.id)
        const { data: latestOrders } = await supabase
          .from("orders")
          .select("client_id, status")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false })

        const latestStatusMap: Record<string, string> = {}
        for (const order of latestOrders ?? []) {
          if (!latestStatusMap[order.client_id]) {
            latestStatusMap[order.client_id] = order.status
          }
        }
        setRecentClients(
          recentCl.map((c) => ({
            ...c,
            latest_order_status: latestStatusMap[c.id] ?? null,
          })),
        )
      } else {
        setRecentClients([])
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-enter">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
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
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      trend: stats?.clientTrend,
      trendLabel: "30 hari",
    },
    {
      label: "Pesanan Aktif",
      value: stats?.activeOrders?.toString() ?? "0",
      icon: ShoppingBag,
      description: stats?.activeOrders ? `${stats.activeOrders} pesanan berjalan` : "Tidak ada pesanan aktif",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
      iconBg: "bg-primary/15 text-primary",
      trend: stats?.orderTrend,
      trendLabel: "30 hari",
    },
    {
      label: "Menunggu Pembayaran",
      value: stats ? `Rp ${stats.totalUnpaid.toLocaleString("id-ID")}` : "Rp 0",
      icon: CreditCard,
      description: stats?.unpaidOrderCount
        ? `${stats.unpaidOrderCount} tagihan tertunda`
        : "Semua pembayaran lunas",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      alert: (stats?.unpaidOrderCount ?? 0) > 0,
      trend: stats?.unpaidOrderCount,
      trendLabel: "tertunda",
    },
    {
      label: "Pesan Masuk",
      value: stats?.unreadMessages?.toString() ?? "0",
      icon: MessageSquare,
      description: stats?.unreadMessages ? `${stats.unreadMessages} pesan belum dibalas` : "Inbox bersih ✨",
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
      iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      alert: (stats?.unreadMessages ?? 0) > 0,
      trend: stats?.messageTrend,
      trendLabel: "30 hari",
    },
  ]

  const completedOnboardingCount = onboarding
    ? [onboarding.wa, onboarding.clients, onboarding.orders].filter(Boolean).length
    : 0
  const isAllOnboarded = completedOnboardingCount === 3

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-enter">
      {/* Top Header & Command Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl lg:text-3xl tracking-tight text-foreground">
              {getGreeting()}
              {businessName ? `, ${businessName}` : ""}
            </h1>
            {/* Live WhatsApp Status Badge */}
            {waConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                WhatsApp Terhubung
              </span>
            ) : (
              <Link
                href="/settings?tab=whatsapp"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                WhatsApp Terputus • Hubungkan
              </Link>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Pantau arus kas, percakapan pelanggan WhatsApp, dan pesanan berjalan secara realtime.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/clients")}
            className="h-9 px-3.5 text-xs font-medium gap-1.5 shadow-xs hover:border-primary/50"
          >
            <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
            + Tambah Klien
          </Button>

          <Button
            size="sm"
            onClick={() => router.push("/clients")}
            className="h-9 px-4 text-xs font-medium gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            + Pesanan Baru
          </Button>
        </div>
      </div>

      {/* KPI Metrics Hero Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(
          ({ label, value, icon: Icon, description, iconBg, trend, trendLabel, alert }, i) => (
            <div
              key={label}
              style={{ "--stagger-i": i } as CSSProperties}
              className={cn(
                "animate-stagger-item rounded-xl border border-border bg-card p-4.5 space-y-3 relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/80 group",
                alert && "ring-1 ring-primary/20",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                  {label}
                </p>
                <div
                  className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <p className="font-display font-bold text-2xl lg:text-3xl tracking-tight text-foreground">
                  {value}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {description}
                </p>
              </div>

              {trend !== undefined && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                  {trend > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +{trend} ({trendLabel})
                    </span>
                  ) : trend < 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" /> {trend} ({trendLabel})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Stabil ({trendLabel})</span>
                  )}
                  <span className="text-[10px] text-muted-foreground/80">30 hari</span>
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {/* Main Operational Asymmetric Grid (8 cols Main, 4 cols Rail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Activity & Operations (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: WhatsApp Priority Inbox Feed */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-sm text-foreground">
                    Pesan Masuk WhatsApp Terkini
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {stats?.unreadMessages ? `${stats.unreadMessages} pesan baru belum dibalas` : "Semua pesan telah ditanggapi"}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-primary font-medium hover:bg-primary/10 gap-1"
                onClick={() => router.push("/inbox")}
              >
                Buka Inbox <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {recentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">Inbox WhatsApp Bersih ✨</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Pesan masuk baru dari pelanggan akan langsung muncul di sini secara otomatis.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/inbox")}
                  className="mt-4 h-8 text-xs"
                >
                  Lihat Riwayat Obrolan
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMessages.map((msg, i) => {
                  const displayPhone = msg.whatsapp_number
                    .replace(/^62/, "0")
                    .replace(/@s\.whatsapp\.net$/, "")
                  const title = msg.contact_name || displayPhone
                  const preview =
                    msg.message_body.length > 75
                      ? msg.message_body.slice(0, 75) + "…"
                      : msg.message_body
                  const time = new Date(msg.received_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  return (
                    <div
                      key={msg.id}
                      style={{ "--stagger-i": i } as CSSProperties}
                      className="animate-stagger-item flex items-center justify-between gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/40 transition-all group cursor-pointer"
                      onClick={() => router.push("/inbox")}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 text-violet-600 font-bold text-xs">
                          {msg.contact_name
                            ? msg.contact_name.slice(0, 2).toUpperCase()
                            : displayPhone.slice(-2)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-foreground truncate">{title}</p>
                            {msg.contact_name && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                ({displayPhone})
                              </span>
                            )}
                            {msg.classification && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase font-medium">
                                {msg.classification}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                            {preview}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] text-muted-foreground tabular-nums">{time}</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2.5 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push("/inbox")
                          }}
                        >
                          <Send className="w-3 h-3" /> Balas
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card 2: Recent Clients & Orders */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-sm text-foreground">
                    Klien & Aktivitas Pesanan Terkini
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Daftar klien terbaru dan status pesanan berjalan mereka
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-primary font-medium hover:bg-primary/10 gap-1"
                onClick={() => router.push("/clients")}
              >
                Kelola Semua <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {recentClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">Belum ada Klien Terdaftar</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Tambahkan klien pertama kamu atau import dari kontak WhatsApp untuk mulai mencatat pesanan.
                </p>
                <Button
                  size="sm"
                  onClick={() => router.push("/clients")}
                  className="mt-4 h-8 text-xs gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Tambah Klien Pertama
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentClients.map((client, i) => {
                  const statusMap: Record<
                    string,
                    { label: string; bg: string; text: string; border: string }
                  > = {
                    aktif: {
                      label: "Pesanan Aktif",
                      bg: "bg-blue-500/10",
                      text: "text-blue-600 dark:text-blue-400",
                      border: "border-blue-500/20",
                    },
                    selesai: {
                      label: "Selesai",
                      bg: "bg-emerald-500/10",
                      text: "text-emerald-600 dark:text-emerald-400",
                      border: "border-emerald-500/20",
                    },
                    lunas: {
                      label: "Lunas",
                      bg: "bg-emerald-500/10",
                      text: "text-emerald-600 dark:text-emerald-400",
                      border: "border-emerald-500/20",
                    },
                    dibatalkan: {
                      label: "Dibatalkan",
                      bg: "bg-rose-500/10",
                      text: "text-rose-600 dark:text-rose-400",
                      border: "border-rose-500/20",
                    },
                  }

                  const st = client.latest_order_status
                    ? statusMap[client.latest_order_status] ?? {
                        label: client.latest_order_status,
                        bg: "bg-muted",
                        text: "text-muted-foreground",
                        border: "border-border",
                      }
                    : null

                  const createdDate = new Date(client.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })

                  return (
                    <div
                      key={client.id}
                      style={{ "--stagger-i": i } as CSSProperties}
                      className="animate-stagger-item flex items-center justify-between gap-4 py-3 px-2 hover:bg-accent/30 rounded-lg transition-colors cursor-pointer group"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                          {client.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {client.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {client.whatsapp_number || "Tidak ada nomor WA"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {st ? (
                          <span
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                              st.bg,
                              st.text,
                              st.border,
                            )}
                          >
                            {st.label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/80 px-2 py-0.5 rounded bg-muted/60">
                            Belum ada pesanan
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {createdDate}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Action Center, Onboarding, & Quick Tools (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Widget 1: Action Center / Perlu Pengecekan */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h2 className="font-display font-semibold text-sm text-foreground">
                  Pusat Tindakan Cepat
                </h2>
              </div>
              {pendingItems.length > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                  {pendingItems.length} Perlu Respon
                </Badge>
              )}
            </div>

            {pendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs font-semibold text-foreground">Semua Urusan Terkendali ✨</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Tidak ada tagihan pembayaran overdue atau jadwal janji temu tertunda untuk hari ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingItems.map((item, i) => (
                  <div
                    key={i}
                    style={{ "--stagger-i": i } as CSSProperties}
                    className={cn(
                      "animate-stagger-item p-3 rounded-lg border text-xs space-y-1.5 transition-colors",
                      item.severity === "danger"
                        ? "bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-200"
                        : "bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-200",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                            item.severity === "danger" ? "bg-rose-500 animate-pulse" : "bg-amber-500",
                          )}
                        />
                        <p className="font-semibold text-foreground truncate">{item.title}</p>
                      </div>
                      {item.type === "payment" && item.clientPhone && (
                        <a
                          href={`https://wa.me/${item.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Halo ${item.clientName || ""}, mengingatkan untuk pembayaran ${item.description}`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 flex-shrink-0"
                        >
                          Tagih WA <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-4">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget 2: Onboarding & Setup Tracker */}
          {!isAllOnboarded && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="font-display font-semibold text-sm text-foreground">
                    Langkah Awal Bisnis
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("glim:open-wizard"))}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Panduan
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progres Penyiapan</span>
                  <span className="font-semibold text-foreground">{completedOnboardingCount}/3 Selesai</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${(completedOnboardingCount / 3) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {[
                  {
                    step: "1",
                    title: "Hubungkan WhatsApp",
                    desc: "Scan QR untuk terima & balas pesan",
                    href: "/settings?tab=whatsapp",
                    done: onboarding?.wa ?? false,
                  },
                  {
                    step: "2",
                    title: "Tambah Klien Pertama",
                    desc: "Kelola daftar kontak pelanggan",
                    href: "/clients",
                    done: onboarding?.clients ?? false,
                  },
                  {
                    step: "3",
                    title: "Buat Pesanan & Tagihan",
                    desc: "Atur termin & pengingat otomatis",
                    href: "/clients",
                    done: onboarding?.orders ?? false,
                  },
                ].map(({ step, title, desc, href, done }) => (
                  <Link
                    key={step}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg text-xs transition-colors border",
                      done
                        ? "bg-muted/40 border-transparent opacity-60"
                        : "bg-card border-border hover:border-primary/40 hover:bg-accent/40",
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0",
                        done ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary",
                      )}
                    >
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium truncate", done && "line-through text-muted-foreground")}>
                        {title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Widget 3: Quick Tools & Shortcuts */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <h2 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Pintasan Cepat
            </h2>
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/import"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background hover:bg-accent hover:border-border transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <UserPlus className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Import Kontak Klien</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/settings"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background hover:bg-accent hover:border-border transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Wand2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Atur Suara Brand & AI</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/inbox"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background hover:bg-accent hover:border-border transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-foreground">Status WhatsApp & Obrolan</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
