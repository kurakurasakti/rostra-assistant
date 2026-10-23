"use client"

import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface DashboardData {
  businessName: string
  waConnected: boolean
  totalClients: number
  newClients30d: number
  activeOrders: number
  hasAnyOrder: boolean
  unreadMessages: number
  dueTotal: number
  duePayments: DuePayment[]
  appointments: TodayAppointment[]
  recentMessages: RecentMessage[]
  recentClients: RecentClient[]
}

interface DuePayment {
  stageName: string
  amount: number
  dueDate: string
  clientName: string
  clientPhone: string | null
}

interface TodayAppointment {
  title: string
  scheduledAt: string
  clientName: string
}

interface RecentMessage {
  id: string
  displayName: string
  body: string
  receivedAt: string
  classification: string | null
  hasDraft: boolean
}

interface RecentClient {
  id: string
  name: string
  createdAt: string
  latestOrderStatus: string | null
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  aktif: "Pesanan berjalan",
  selesai: "Selesai",
  lunas: "Lunas",
  dibatalkan: "Dibatalkan",
}

const CLASSIFICATION_NOTE: Record<string, string> = {
  sensitif: "Perlu kamu cek",
  tidak_diketahui: "AI belum yakin",
}

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function digitsOnly(phone: string): string {
  return phone.replace(/@s\.whatsapp\.net$/, "").replace(/\D/g, "")
}

/** 62812… / 0812… → 0812… for display. */
function displayPhone(phone: string): string {
  const d = digitsOnly(phone)
  return d.startsWith("62") ? `0${d.slice(2)}` : d
}

/** Any Indonesian variant → 62812… for wa.me links and matching. */
function waMeNumber(phone: string): string {
  const d = digitsOnly(phone)
  if (d.startsWith("0")) return `62${d.slice(1)}`
  if (d.startsWith("8")) return `62${d}`
  return d
}

function relativeTime(iso: string): string {
  const then = new Date(iso)
  const diffMin = Math.floor((Date.now() - then.getTime()) / 60_000)
  if (diffMin < 1) return "baru saja"
  if (diffMin < 60) return `${diffMin} mnt`
  if (localDateKey(then) === localDateKey(new Date())) return `${Math.floor(diffMin / 60)} jam`
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (localDateKey(then) === localDateKey(yesterday)) return "kemarin"
  return then.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

function dueLabel(dueDate: string): string {
  if (dueDate === localDateKey(new Date())) return "jatuh tempo hari ini"
  const date = new Date(`${dueDate}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  })
  return `lewat tempo sejak ${date}`
}

function joinIndonesian(parts: string[]): string {
  if (parts.length <= 1) return parts.join("")
  return `${parts.slice(0, -1).join(", ")} dan ${parts[parts.length - 1]}`
}

function buildBriefing(data: DashboardData): string {
  const parts: string[] = []
  if (data.unreadMessages > 0) parts.push(`${data.unreadMessages} pesan belum dibalas`)
  if (data.duePayments.length > 0)
    parts.push(`${data.duePayments.length} tagihan jatuh tempo senilai ${rupiah(data.dueTotal)}`)
  if (data.appointments.length > 0) parts.push(`${data.appointments.length} janji temu`)
  if (parts.length === 0) return "Tidak ada yang perlu ditindaklanjuti hari ini."
  return `Hari ini ada ${joinIndonesian(parts)}.`
}

async function loadDashboard(): Promise<DashboardData | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  // Local-day bounds (WIB for our users), not UTC date strings.
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

  const [
    profileRes,
    clientCountRes,
    oldClientCountRes,
    activeOrderRes,
    anyOrderRes,
    unreadRes,
    dueRes,
    apptRes,
    messagesRes,
    recentClientsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("wa_connected, business_name").eq("id", user.id).single(),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lt("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "aktif"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("inbox_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "baru")
      .eq("direction", "masuk"),
    supabase
      .from("payment_stages")
      .select("amount, due_date, name, orders!inner(user_id, clients!inner(name, whatsapp_number))")
      .eq("paid", false)
      .eq("orders.user_id", user.id)
      .lte("due_date", localDateKey(now))
      .order("due_date", { ascending: true }),
    supabase
      .from("appointments")
      .select("title, scheduled_at, clients!inner(name, user_id)")
      .eq("clients.user_id", user.id)
      .gte("scheduled_at", startOfToday.toISOString())
      .lt("scheduled_at", startOfTomorrow.toISOString())
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("inbox_messages")
      .select(
        "id, whatsapp_number, sender_name, message_body, received_at, classification, ai_draft_reply",
      )
      .eq("user_id", user.id)
      .eq("status", "baru")
      .eq("direction", "masuk")
      .order("received_at", { ascending: false })
      .limit(6),
    supabase
      .from("clients")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  let waConnected = profileRes.data?.wa_connected ?? false
  let businessName = profileRes.data?.business_name ?? ""

  if (profileRes.error?.code === "PGRST116") {
    const { data: inserted } = await supabase
      .from("profiles")
      .insert({ id: user.id, business_name: "", brand_voice: "Ramah, profesional, dan informatif" })
      .select("wa_connected, business_name")
      .single()
    if (inserted) {
      waConnected = inserted.wa_connected
      businessName = inserted.business_name ?? ""
    }
  }

  const duePayments: DuePayment[] = (dueRes.data ?? []).map((ps) => {
    const client = (
      ps as unknown as { orders: { clients: { name: string; whatsapp_number: string | null } } }
    ).orders?.clients
    return {
      stageName: ps.name || "Pembayaran",
      amount: Number(ps.amount),
      dueDate: ps.due_date,
      clientName: client?.name ?? "Klien",
      clientPhone: client?.whatsapp_number ?? null,
    }
  })

  const appointments: TodayAppointment[] = (apptRes.data ?? []).map((apt) => ({
    title: apt.title || "Janji temu",
    scheduledAt: apt.scheduled_at,
    clientName: (apt as unknown as { clients: { name: string } }).clients?.name ?? "Klien",
  }))

  // Resolve contact names only for the numbers on screen, not the whole client list.
  const msgs = messagesRes.data ?? []
  const phoneVariants = new Set<string>()
  for (const m of msgs) {
    const d = digitsOnly(m.whatsapp_number)
    phoneVariants.add(d)
    phoneVariants.add(displayPhone(d))
    phoneVariants.add(waMeNumber(d))
  }
  const nameByPhone: Record<string, string> = {}
  if (phoneVariants.size > 0) {
    const { data: matched } = await supabase
      .from("clients")
      .select("name, whatsapp_number")
      .eq("user_id", user.id)
      .in("whatsapp_number", [...phoneVariants])
    for (const c of matched ?? []) {
      if (c.whatsapp_number) nameByPhone[waMeNumber(c.whatsapp_number)] = c.name
    }
  }

  const recentMessages: RecentMessage[] = msgs.map((m) => ({
    id: m.id,
    displayName:
      nameByPhone[waMeNumber(m.whatsapp_number)] ||
      m.sender_name ||
      displayPhone(m.whatsapp_number),
    body: m.message_body,
    receivedAt: m.received_at,
    classification: m.classification,
    hasDraft: Boolean(m.ai_draft_reply),
  }))

  const recentCl = recentClientsRes.data ?? []
  const latestStatus: Record<string, string> = {}
  if (recentCl.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("client_id, status")
      .in(
        "client_id",
        recentCl.map((c) => c.id),
      )
      .order("created_at", { ascending: false })
    for (const o of orders ?? []) {
      if (!latestStatus[o.client_id]) latestStatus[o.client_id] = o.status
    }
  }

  const totalClients = clientCountRes.count ?? 0

  return {
    businessName,
    waConnected,
    totalClients,
    newClients30d: totalClients - (oldClientCountRes.count ?? 0),
    activeOrders: activeOrderRes.count ?? 0,
    hasAnyOrder: (anyOrderRes.count ?? 0) > 0,
    unreadMessages: unreadRes.count ?? 0,
    dueTotal: duePayments.reduce((sum, p) => sum + p.amount, 0),
    duePayments,
    appointments,
    recentMessages,
    recentClients: recentCl.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.created_at,
      latestOrderStatus: latestStatus[c.id] ?? null,
    })),
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return <DashboardSkeleton />

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const setupSteps = [
    { title: "Hubungkan WhatsApp", href: "/settings?tab=whatsapp", done: data.waConnected },
    { title: "Tambah klien pertama", href: "/clients", done: data.totalClients > 0 },
    { title: "Buat pesanan dan jadwal tagihan", href: "/clients", done: data.hasAnyOrder },
  ]
  const setupDone = setupSteps.filter((s) => s.done).length

  return (
    <div className="animate-enter mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {/* Briefing — the one loud element on the page */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm text-muted-foreground">
            {today}
            {data.businessName ? `, ${data.businessName}` : ""}
          </p>
          <h1 className="mt-2 text-balance font-display text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl">
            {buildBriefing(data)}
          </h1>
          <WhatsAppStatus connected={data.waConnected} />
        </div>
        <div className="flex gap-2">
          <Link href="/clients" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Tambah klien
          </Link>
          <Link href="/inbox" className={buttonVariants({ size: "sm" })}>
            Buka inbox
          </Link>
        </div>
      </header>

      {/* Figures */}
      <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-lg border border-border lg:grid-cols-4">
        <Figure
          label="Belum dibalas"
          value={String(data.unreadMessages)}
          note={data.unreadMessages > 0 ? "pesan di inbox" : "inbox sudah bersih"}
          href="/inbox"
        />
        <Figure
          label="Tagihan jatuh tempo"
          value={rupiah(data.dueTotal)}
          note={
            data.duePayments.length > 0
              ? `dari ${data.duePayments.length} tagihan`
              : "tidak ada yang tertunggak"
          }
          tone={data.duePayments.length > 0 ? "danger" : undefined}
        />
        <Figure
          label="Pesanan berjalan"
          value={String(data.activeOrders)}
          note={data.activeOrders > 0 ? "sedang dikerjakan" : "belum ada pesanan aktif"}
          href="/clients"
        />
        <Figure
          label="Klien"
          value={String(data.totalClients)}
          note={
            data.newClients30d > 0
              ? `${data.newClients30d} baru dalam 30 hari`
              : "belum ada klien baru bulan ini"
          }
          href="/clients"
        />
      </dl>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Messages — the main job */}
        <section className="lg:col-span-7" aria-labelledby="messages-heading">
          <SectionHeading
            id="messages-heading"
            title="Pesan belum dibalas"
            href="/inbox"
            linkLabel="Semua pesan"
          />
          {data.recentMessages.length === 0 ? (
            <EmptyNote>
              {data.waConnected
                ? "Semua pesan sudah dibalas. Pesan baru dari pelanggan muncul di sini."
                : "Hubungkan WhatsApp agar pesan pelanggan masuk ke sini."}
            </EmptyNote>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentMessages.map((msg) => (
                <li key={msg.id}>
                  <Link
                    href="/inbox"
                    className="-mx-2 block rounded-md px-2 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-foreground">
                        {msg.displayName}
                      </p>
                      <time
                        dateTime={msg.receivedAt}
                        className="shrink-0 text-xs tabular-nums text-muted-foreground"
                      >
                        {relativeTime(msg.receivedAt)}
                      </time>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{msg.body}</p>
                    <MessageNote msg={msg} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-10 lg:col-span-5">
          {setupDone < setupSteps.length && (
            <section aria-labelledby="setup-heading" className="rounded-lg bg-muted/50 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  id="setup-heading"
                  className="font-display text-base font-medium text-foreground"
                >
                  Siapkan akun kamu
                </h2>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {setupDone} dari {setupSteps.length}
                </span>
              </div>
              <ol className="mt-4 space-y-1">
                {setupSteps.map((step, i) => (
                  <li key={step.title}>
                    <Link
                      href={step.href}
                      className="flex items-center gap-3 rounded-md px-1 py-1.5 text-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {step.done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 text-[10px] tabular-nums text-muted-foreground">
                          {i + 1}
                        </span>
                      )}
                      <span className={cn(step.done && "text-muted-foreground line-through")}>
                        {step.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("glim:open-wizard"))}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Buka panduan
              </button>
            </section>
          )}

          <section aria-labelledby="today-heading">
            <SectionHeading id="today-heading" title="Hari ini" />
            {data.appointments.length === 0 && data.duePayments.length === 0 ? (
              <EmptyNote>Tidak ada janji temu atau tagihan jatuh tempo hari ini.</EmptyNote>
            ) : (
              <ul className="divide-y divide-border">
                {data.appointments.map((apt) => (
                  <li key={`${apt.scheduledAt}-${apt.clientName}`} className="flex gap-4 py-3">
                    <time
                      dateTime={apt.scheduledAt}
                      className="w-12 shrink-0 text-sm font-medium tabular-nums text-foreground"
                    >
                      {new Date(apt.scheduledAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{apt.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{apt.clientName}</p>
                    </div>
                  </li>
                ))}
                {data.duePayments.map((p) => (
                  <li
                    key={`${p.clientName}-${p.stageName}-${p.dueDate}`}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {p.clientName}, {p.stageName}
                      </p>
                      <p className="text-sm text-destructive">{dueLabel(p.dueDate)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums text-foreground">
                        {rupiah(p.amount)}
                      </p>
                      {p.clientPhone && (
                        <a
                          href={`https://wa.me/${waMeNumber(p.clientPhone)}?text=${encodeURIComponent(
                            `Halo ${p.clientName}, mengingatkan pembayaran ${p.stageName} sebesar ${rupiah(p.amount)}. Terima kasih.`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Ingatkan via WA
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="clients-heading">
            <SectionHeading
              id="clients-heading"
              title="Klien terbaru"
              href="/clients"
              linkLabel="Semua klien"
            />
            {data.recentClients.length === 0 ? (
              <EmptyNote>
                Belum ada klien.{" "}
                <Link href="/import" className="font-medium text-primary hover:underline">
                  Import dari Excel
                </Link>{" "}
                atau tambahkan satu per satu.
              </EmptyNote>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentClients.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/clients/${c.id}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.latestOrderStatus
                            ? (ORDER_STATUS_LABEL[c.latestOrderStatus] ?? c.latestOrderStatus)
                            : "Belum ada pesanan"}
                        </p>
                      </div>
                      <time
                        dateTime={c.createdAt}
                        className="shrink-0 text-xs tabular-nums text-muted-foreground"
                      >
                        {new Date(c.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function WhatsAppStatus({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        WhatsApp terhubung
      </p>
    )
  }
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      WhatsApp belum terhubung, pesan pelanggan tidak masuk.
      <Link href="/settings?tab=whatsapp" className="font-medium text-primary hover:underline">
        Hubungkan
      </Link>
    </p>
  )
}

function Figure({
  label,
  value,
  note,
  href,
  tone,
}: {
  label: string
  value: string
  note: string
  href?: string
  tone?: "danger"
}) {
  const content = (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-display text-2xl font-medium tabular-nums tracking-tight",
          tone === "danger" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">{note}</dd>
    </>
  )
  // 2×2 on mobile, 1×4 on desktop; dividers follow the grid.
  const cell =
    "border-border p-4 sm:p-5 odd:border-r [&:nth-child(-n+2)]:border-b lg:border-r lg:last:border-r-0 lg:[&:nth-child(-n+2)]:border-b-0"
  return href ? (
    <Link
      href={href}
      className={cn(
        cell,
        "block transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
    >
      {content}
    </Link>
  ) : (
    <div className={cell}>{content}</div>
  )
}

function SectionHeading({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string
  title: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-border pb-2">
      <h2 id={id} className="font-display text-base font-medium text-foreground">
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

function MessageNote({ msg }: { msg: RecentMessage }) {
  const note = msg.classification ? CLASSIFICATION_NOTE[msg.classification] : undefined
  if (note) {
    return <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">{note}</p>
  }
  if (msg.hasDraft) {
    return <p className="mt-1 text-xs font-medium text-primary">Draf balasan siap</p>
  }
  return null
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-muted-foreground">{children}</p>
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-3 h-8 w-full max-w-xl" />
      <Skeleton className="mt-2 h-8 w-2/3 max-w-md" />
      <Skeleton className="mt-8 h-24 w-full rounded-lg" />
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-3 lg:col-span-7">
          {["m1", "m2", "m3", "m4", "m5"].map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
          ))}
        </div>
        <div className="space-y-3 lg:col-span-5">
          {["s1", "s2", "s3", "s4"].map((k) => (
            <Skeleton key={k} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
