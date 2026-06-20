"use client"

import { useState, useEffect, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Users, ShoppingBag, CreditCard, MessageSquare, ArrowRight, Clock, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
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
}

interface RecentMessage {
  id: string
  whatsapp_number: string
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

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState<{ wa: boolean; clients: boolean; orders: boolean } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [profileRes, clientRes, orderRes, messagesRes, allOrdersRes, prevClientRes, prevOrderRes, prevMessageRes] = await Promise.all([
        supabase.from("profiles").select("wa_connected").eq("id", user.id).single(),
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "aktif"),
        supabase.from("inbox_messages").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "baru").eq("direction", "masuk"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id).lt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "aktif").lt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("inbox_messages").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "baru").eq("direction", "masuk").lt("received_at", thirtyDaysAgo.toISOString()),
      ])

      let waConnected = profileRes.data?.wa_connected ?? false

      if (profileRes.error && profileRes.error.code === "PGRST116") {
        console.log("Profile missing on dashboard load, creating default profile for user:", user.id);
        const { data: insertedData, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            business_name: "",
            brand_voice: "Ramah, profesional, dan informatif",
          })
          .select("wa_connected")
          .single();
        if (!insertError && insertedData) {
          waConnected = insertedData.wa_connected;
        }
      }

      const { data: unpaidStages } = await supabase
        .from("payment_stages")
        .select("amount, due_date, orders!inner(user_id)")
        .eq("paid", false)
        .eq("orders.user_id", user.id)
        .lte("due_date", today.toISOString().split("T")[0])

      const totalUnpaid = unpaidStages?.reduce((sum, ps) => sum + Number(ps.amount), 0) ?? 0

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
        clientTrend: (clientRes.count ?? 0) - (prevClientRes.count ?? 0),
        orderTrend: (orderRes.count ?? 0) - (prevOrderRes.count ?? 0),
        messageTrend: (messagesRes.count ?? 0) - (prevMessageRes.count ?? 0),
      })
      setOnboarding({
        wa: waConnected,
        clients: (clientRes.count ?? 0) > 0,
        orders: (allOrdersRes.count ?? 0) > 0,
      })

      // Recent unread messages
      const { data: recentMsgs } = await supabase
        .from("inbox_messages")
        .select("id, whatsapp_number, message_body, received_at, classification")
        .eq("user_id", user.id)
        .eq("status", "baru")
        .eq("direction", "masuk")
        .order("received_at", { ascending: false })
        .limit(5)
      setRecentMessages(recentMsgs ?? [])

      // Recent clients with latest order status
      const { data: recentCl } = await supabase
        .from("clients")
        .select("id, name, whatsapp_number, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (recentCl && recentCl.length > 0) {
        const clientIds = recentCl.map(c => c.id)
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
        setRecentClients(recentCl.map(c => ({
          ...c,
          latest_order_status: latestStatusMap[c.id] ?? null,
        })))
      } else {
        setRecentClients([])
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-enter">
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
      color: "text-blue-600 dark:text-blue-400",
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
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      trend: stats?.unpaidOrderCount,
      trendLabel: "tertunda",
    },
    {
      label: "Pesan Masuk",
      value: stats?.unreadMessages?.toString() ?? "0",
      icon: MessageSquare,
      description: stats?.unreadMessages ? `${stats.unreadMessages} belum dibaca` : "Inbox kosong",
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
      trend: stats?.messageTrend,
      trendLabel: "30 hari",
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-enter">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Selamat datang di Rostra. Pantau bisnis kamu dari sini.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, description, color, bg, trend, trendLabel }, i) => (
          <div key={label} style={{ '--stagger-i': i } as CSSProperties} className="animate-stagger-item rounded-xl border border-border bg-card p-4 space-y-3">
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
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +{trend} ({trendLabel})
                </p>
              )}
              {trend !== undefined && trend < 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-0.5">
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

      <div className={cn("grid gap-6", onboarding?.wa && onboarding?.clients && onboarding?.orders ? "lg:grid-cols-1" : "lg:grid-cols-2")}>
        {/* Getting started — hidden when all 3 done */}
        {!(onboarding?.wa && onboarding?.clients && onboarding?.orders) && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-sm">Mulai dengan Rostra</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {onboarding
                  ? `${[onboarding.wa, onboarding.clients, onboarding.orders].filter(Boolean).length}/3 selesai`
                  : "3 langkah"}
              </span>
            </div>
            <div className="space-y-3">
              {[
                { step: "01", title: "Hubungkan WhatsApp", desc: "Scan QR untuk mulai terima dan balas pesan", href: "/settings?tab=whatsapp", done: onboarding?.wa ?? false },
                { step: "02", title: "Tambah klien pertama", desc: "Mulai kelola daftar klien kamu", href: "/clients", done: onboarding?.clients ?? false },
                { step: "03", title: "Buat pesanan pertama", desc: "Catat pesanan dan atur tahap pembayaran", href: "/clients", done: onboarding?.orders ?? false },
              ].map(({ step, title, desc, href, done }) => (
                <a key={step} href={href}
                  className={cn(
                    "flex items-start gap-4 p-3 rounded-lg transition-colors group",
                    done ? "opacity-60" : "hover:bg-accent"
                  )}
                >
                  <span className={cn(
                    "font-display font-bold text-xs w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    done ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                  )}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-none", done && "line-through text-muted-foreground")}>{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                    : <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  }
                </a>
              ))}
            </div>
          </div>
        )}

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
              <p className="text-sm font-medium text-foreground">Tidak ada yang perlu diperhatikan</p>
              <p className="text-xs text-muted-foreground mt-1">Pembayaran jatuh tempo dan janji temu akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item, i) => (
                <div key={i} style={{ '--stagger-i': i } as CSSProperties} className={`animate-stagger-item flex items-start gap-3 p-3 rounded-lg ${
                  item.severity === "danger"
                    ? "bg-red-500/5 border border-red-500/20"
                    : "bg-amber-500/5 border border-amber-500/20"
                }`}>
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.severity === "danger" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pesan Masuk Terbaru + Klien Terbaru */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Pesan Masuk Terbaru */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Pesan Masuk Terbaru</h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground px-2" onClick={() => router.push("/inbox")}>
              Lihat semua <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {recentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Tidak ada pesan baru</p>
              <p className="text-xs text-muted-foreground mt-1">Pesan yang belum dibalas akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentMessages.map((msg, i) => {
                const display = msg.whatsapp_number.replace(/^62/, "0").replace(/@s\.whatsapp\.net$/, "")
                const preview = msg.message_body.length > 60 ? msg.message_body.slice(0, 60) + "…" : msg.message_body
                const time = new Date(msg.received_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                return (
                  <div key={msg.id} style={{ '--stagger-i': i } as CSSProperties} className="animate-stagger-item flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{display.slice(-2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{display}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground">{time}</p>
                      <Button size="sm" variant="outline" className="h-5 text-[10px] px-2 py-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => router.push("/inbox")}>
                        Balas
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Klien Terbaru */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm">Klien Terbaru</h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground px-2" onClick={() => router.push("/clients")}>
              Lihat semua <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {recentClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Belum ada klien</p>
              <p className="text-xs text-muted-foreground mt-1">Tambah klien pertama untuk mulai</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentClients.map((client, i) => {
                const statusColor: Record<string, string> = {
                  aktif: "bg-blue-500/10 text-blue-600",
                  selesai: "bg-emerald-500/10 text-emerald-600",
                  lunas: "bg-emerald-500/10 text-emerald-600",
                  dibatalkan: "bg-red-500/10 text-red-600",
                }
                const statusLabel: Record<string, string> = {
                  aktif: "Aktif",
                  selesai: "Selesai",
                  lunas: "Lunas",
                  dibatalkan: "Batal",
                }
                return (
                  <div key={client.id} style={{ '--stagger-i': i } as CSSProperties} className="animate-stagger-item flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer" onClick={() => router.push(`/clients/${client.id}`)}>
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-violet-600">{client.name.slice(0, 1).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{client.whatsapp_number}</p>
                    </div>
                    {client.latest_order_status ? (
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0", statusColor[client.latest_order_status] ?? "bg-muted text-muted-foreground")}>
                        {statusLabel[client.latest_order_status] ?? client.latest_order_status}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">Belum ada pesanan</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
