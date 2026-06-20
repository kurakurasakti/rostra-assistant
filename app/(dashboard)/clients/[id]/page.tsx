"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Plus, MessageSquare, ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronDown, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { format, parseISO, formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { normalizeWANumber } from "@/lib/whatsapp"
import type { Appointment, Client, PaymentStage, ScheduledMessage, FullOrder, InboxMessage } from "@/types"
import OrderCard from "@/components/clients/OrderCard"
import OrderFormModal from "@/components/clients/OrderFormModal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateTimePicker } from "@/components/ui/date-time-picker"

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const clientId = params.id

  const [client, setClient] = useState<Client | null>(null)
  const [orders, setOrders] = useState<FullOrder[]>([])
  const [standaloneAppointments, setStandaloneAppointments] = useState<Appointment[]>([])
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // Profile edit state
  const [editName, setEditName] = useState("")
  const [editWA, setEditWA] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editAINotes, setEditAINotes] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  // Order modal state
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<FullOrder | null>(null)

  // Standalone appointment modal state
  const [apptModalOpen, setApptModalOpen] = useState(false)
  const [apptSaving, setApptSaving] = useState(false)
  const [apptForm, setApptForm] = useState({
    title: "",
    scheduled_at: "",
    location: "",
    reminder_hours_before: "24",
    notes: "",
  })

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [clientRes, ordersRes, messagesRes, standaloneApptRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).eq("user_id", user.id).single(),
      supabase
        .from("orders")
        .select("*, payment_stages(*), appointments(*), scheduled_messages(*)")
        .eq("client_id", clientId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("inbox_messages")
        .select("*")
        .eq("user_id", user.id)
        .eq("client_id", clientId)
        .order("received_at", { ascending: false })
        .limit(50),
      supabase
        .from("appointments")
        .select("*")
        .eq("client_id", clientId)
        .eq("user_id", user.id)
        .is("order_id", null)
        .order("scheduled_at", { ascending: true }),
    ])

    if (!clientRes.data) { router.push("/clients"); return }

    const c = clientRes.data
    setClient(c)
    setEditName(c.name); setEditWA(c.whatsapp_number)
    setEditEmail(c.email ?? ""); setEditNotes(c.notes ?? ""); setEditAINotes(c.ai_notes ?? "")
    setOrders(ordersRes.data ?? [])
    setStandaloneAppointments(standaloneApptRes.data ?? [])
    setMessages(messagesRes.data ?? [])
    setLoading(false)
  }, [clientId, router])

  useEffect(() => { loadData() }, [loadData])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizeWANumber(editWA)
    if (!normalized) { toast.error("Format nomor WA tidak valid"); return }

    setSavingProfile(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("clients").update({
      name: editName.trim(),
      whatsapp_number: normalized,
      email: editEmail.trim() || null,
      notes: editNotes.trim() || null,
      ai_notes: editAINotes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", clientId)

    if (error) toast.error("Gagal menyimpan.")
    else { toast.success("Profil klien diperbarui."); loadData() }
    setSavingProfile(false)
  }

  // --- Order CRUD ---

  function openNewOrder() {
    setEditingOrder(null)
    setOrderModalOpen(true)
  }

  function openEditOrder(order: FullOrder) {
    setEditingOrder(order)
    setOrderModalOpen(true)
  }

  function openApptModal() {
    setApptForm({ title: "", scheduled_at: "", location: "", reminder_hours_before: "24", notes: "" })
    setApptModalOpen(true)
  }

  async function handleSaveStandaloneAppointment(e: React.FormEvent) {
    e.preventDefault()
    if (!apptForm.title.trim() || !apptForm.scheduled_at) {
      toast.error("Judul dan waktu wajib diisi.")
      return
    }
    setApptSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setApptSaving(false); return }

    const { data: newAppt, error } = await supabase.from("appointments").insert({
      user_id: user.id,
      client_id: clientId,
      order_id: null,
      title: apptForm.title.trim(),
      scheduled_at: new Date(apptForm.scheduled_at).toISOString(),
      location: apptForm.location.trim() || null,
      reminder_hours_before: Number(apptForm.reminder_hours_before),
      notes: apptForm.notes.trim() || null,
    }).select().single()

    if (error || !newAppt) {
      toast.error("Gagal menyimpan janji temu.")
    } else {
      let scheduledCount = 0
      try {
        const res = await fetch("/api/schedules/generate-appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: newAppt.id }),
        })
        const d = await res.json()
        scheduledCount = d.count ?? 0
      } catch {}
      toast.success(`Janji temu disimpan.${scheduledCount > 0 ? " Pengingat dijadwalkan." : ""}`)
      setApptModalOpen(false)
      loadData()
    }
    setApptSaving(false)
  }

  async function handleDeleteStandaloneAppointment(apptId: string) {
    const supabase = createClient()
    await supabase.from("appointments").delete().eq("id", apptId)
    toast.success("Janji temu dihapus.")
    loadData()
  }

  async function handleSaveOrder(data: {
    description: string
    totalPrice: number
    status: "aktif" | "selesai" | "dibatalkan"
    notes: string
    stages: { tempId: string; name: string; amount: string; due_date: string; reminder_days_before: number }[]
    appointments: { tempId: string; title: string; scheduled_at: string; location: string; reminder_hours_before: number; notes: string }[]
  }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let orderId = editingOrder?.id
    if (orderId) {
      await supabase.from("orders").update({
        description: data.description,
        total_price: data.totalPrice,
        status: data.status,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      }).eq("id", orderId)
    } else {
      const { data: newOrder, error } = await supabase.from("orders").insert({
        user_id: user.id,
        client_id: clientId,
        description: data.description,
        total_price: data.totalPrice,
        status: data.status,
        notes: data.notes || null,
      }).select().single()
      if (error || !newOrder) { toast.error("Gagal membuat pesanan."); return }
      orderId = newOrder.id
    }

    await supabase.from("payment_stages").delete().eq("order_id", orderId)
    if (data.stages.length > 0) {
      await supabase.from("payment_stages").insert(data.stages.map((s, i) => ({
        order_id: orderId,
        user_id: user.id,
        name: s.name.trim(),
        amount: Number(s.amount.replace(/\D/g, "")),
        due_date: s.due_date,
        reminder_days_before: s.reminder_days_before,
        sort_order: i,
        paid: false,
      })))
    }

    await supabase.from("appointments").delete().eq("order_id", orderId)
    if (data.appointments.length > 0) {
      await supabase.from("appointments").insert(data.appointments.map(a => ({
        order_id: orderId,
        user_id: user.id,
        client_id: clientId,
        title: a.title.trim(),
        scheduled_at: new Date(a.scheduled_at).toISOString(),
        location: a.location.trim() || null,
        reminder_hours_before: a.reminder_hours_before,
        notes: a.notes.trim() || null,
      })))
    }

    await supabase.from("scheduled_messages").update({ status: "dibatalkan" })
      .eq("order_id", orderId).eq("status", "menunggu")

    let scheduledCount = 0
    try {
      const res = await fetch("/api/schedules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      })
      const d = await res.json()
      scheduledCount = d.count ?? 0
    } catch {}

    toast.success(`Pesanan disimpan. ${scheduledCount} pesan otomatis dijadwalkan.`)
    setOrderModalOpen(false)
    loadData()
  }

  // --- Payment & message actions ---

  async function handleMarkPaid(stage: PaymentStage) {
    const supabase = createClient()
    await supabase.from("payment_stages").update({ paid: true, paid_at: new Date().toISOString() }).eq("id", stage.id)
    await supabase.from("scheduled_messages").update({ status: "dibatalkan" })
      .eq("payment_stage_id", stage.id).eq("status", "menunggu")
    toast.success(`${stage.name} ditandai lunas.`)
    loadData()
  }

  async function handleSendNow(msg: ScheduledMessage) {
    const res = await fetch("/api/scheduled-messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: msg.id }),
    })
    if (res.ok) { toast.success("Pesan berhasil dikirim."); loadData() }
    else { const d = await res.json(); toast.error(d.error ?? "Gagal mengirim.") }
  }

  async function handleCancelMsg(msg: ScheduledMessage) {
    const supabase = createClient()
    await supabase.from("scheduled_messages").update({ status: "dibatalkan" }).eq("id", msg.id)
    toast.success("Pesan dibatalkan.")
    loadData()
  }

  if (loading) return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-enter">
      {/* Header: back + name */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>
      {/* Tabs */}
      <Skeleton className="h-10 w-72 rounded-lg" />
      {/* Profile card */}
      <Skeleton className="h-44 rounded-xl" />
      {/* AI notes */}
      <Skeleton className="h-28 rounded-xl" />
      {/* Orders section header + cards */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  )

  if (!client) return null

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight">{client.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{client.whatsapp_number}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="orders">Pesanan ({orders.length})</TabsTrigger>
          <TabsTrigger value="messages">Riwayat Pesan ({messages.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile */}
        <TabsContent value="profile">
          <form onSubmit={handleSaveProfile} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor WhatsApp *</Label>
              <Input value={editWA} onChange={e => setEditWA(e.target.value)} required className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-muted-foreground font-normal">(opsional)</span></Label>
              <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className="resize-none text-sm" />
            </div>
            <div className="space-y-1.5 border-t border-border pt-4">
              <Label>Catatan untuk AI <span className="text-muted-foreground font-normal">(opsional)</span></Label>
              <Textarea value={editAINotes} onChange={e => setEditAINotes(e.target.value)} placeholder="Contoh: Pelanggan VIP, boleh diskon max 10%. Panggil dengan nama." rows={2} className="resize-none text-sm" />
              <p className="text-xs text-muted-foreground">Catatan ini dibaca AI setiap kali membalas pesan klien ini.</p>
            </div>
            <div className="flex justify-between items-center pt-1">
              <p className="text-xs text-muted-foreground">Klien sejak {format(parseISO(client.created_at), "d MMM yyyy")}</p>
              <Button type="submit" size="sm" disabled={savingProfile}>
                {savingProfile ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Orders */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
                <Plus className="w-4 h-4" />
                  Actions
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={openNewOrder} className="gap-2 cursor-pointer">
                  <ShoppingBag className="w-4 h-4" />
                  Buat Pesanan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openApptModal} className="gap-2 cursor-pointer">
                  <CalendarClock className="w-4 h-4" />
                  Buat Janji Temu
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Standalone appointments */}
          {standaloneAppointments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Janji Temu</p>
              {standaloneAppointments.map(appt => (
                <div key={appt.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{appt.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(appt.scheduled_at), "d MMM yyyy, HH:mm")}
                    </p>
                    {appt.location && (
                      <p className="text-xs text-muted-foreground">📍 {appt.location}</p>
                    )}
                    {appt.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{appt.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteStandaloneAppointment(appt.id)}
                  >
                    Hapus
                  </Button>
                </div>
              ))}
            </div>
          )}

          {orders.length === 0 && standaloneAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Belum ada pesanan atau janji temu</p>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {standaloneAppointments.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Orders</p>
              )}
              {orders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  onEdit={() => openEditOrder(order)}
                  onMarkPaid={handleMarkPaid}
                  onSendNow={handleSendNow}
                  onCancelMsg={handleCancelMsg}
                />
              ))}
            </div>
          ) : null}
        </TabsContent>

        {/* Tab 3: Message History */}
        <TabsContent value="messages">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Belum ada riwayat pesan</p>
              <p className="text-xs text-muted-foreground mt-1">Pesan masuk dan keluar dari klien ini akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => {
                const isIncoming = msg.direction === "masuk"
                const statusColors: Record<string, string> = {
                  baru: "bg-blue-500/10 text-blue-600",
                  dibalas: "bg-emerald-500/10 text-emerald-600",
                  diabaikan: "bg-muted text-muted-foreground",
                  dieskalasi: "bg-amber-500/10 text-amber-600",
                }
                const classificationColors: Record<string, string> = {
                  sensitif: "bg-amber-500/10 text-amber-600",
                  injection_attempt: "bg-red-500/10 text-red-600",
                  rutin: "",
                  tidak_diketahui: "",
                }
                return (
                  <div key={msg.id} className={cn(
                    "flex gap-3 p-3 rounded-lg border",
                    isIncoming ? "border-border bg-muted/20" : "border-primary/20 bg-primary/5"
                  )}>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      isIncoming ? "bg-muted" : "bg-primary/10"
                    )}>
                      {isIncoming
                        ? <ArrowDownLeft className="w-3 h-3 text-muted-foreground" />
                        : <ArrowUpRight className="w-3 h-3 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug text-foreground whitespace-pre-wrap break-words">{msg.message_body}</p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.received_at), { addSuffix: true, locale: localeId })}
                        </span>
                        {msg.status && statusColors[msg.status] && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", statusColors[msg.status])}>
                            {msg.status}
                          </span>
                        )}
                        {msg.classification && classificationColors[msg.classification] && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", classificationColors[msg.classification])}>
                            {msg.classification === "injection_attempt" ? "⚠️ injection" : msg.classification}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {messages.length === 50 && (
                <p className="text-xs text-center text-muted-foreground py-2">Menampilkan 50 pesan terbaru</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Form Modal */}
      <OrderFormModal
        open={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        editingOrder={editingOrder}
        onSave={handleSaveOrder}
      />

      {/* Standalone Appointment Modal */}
      <Dialog open={apptModalOpen} onOpenChange={setApptModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Buat Janji Temu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStandaloneAppointment} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Judul *</Label>
              <Input
                value={apptForm.title}
                onChange={e => setApptForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Cth: Kunjungan fitting awal"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label>Waktu *</Label>
              <DateTimePicker
                value={apptForm.scheduled_at}
                onChange={val => setApptForm(f => ({ ...f, scheduled_at: val }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lokasi <span className="text-muted-foreground font-normal">(opsional)</span></Label>
              <Input
                value={apptForm.location}
                onChange={e => setApptForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Cth: Toko / Rumah klien"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pengingat</Label>
              <Select
                value={apptForm.reminder_hours_before}
                onValueChange={v => setApptForm(f => ({ ...f, reminder_hours_before: v ?? f.reminder_hours_before }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 jam sebelum</SelectItem>
                  <SelectItem value="2">2 jam sebelum</SelectItem>
                  <SelectItem value="6">6 jam sebelum</SelectItem>
                  <SelectItem value="12">12 jam sebelum</SelectItem>
                  <SelectItem value="24">1 hari sebelum</SelectItem>
                  <SelectItem value="48">2 hari sebelum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
              <Textarea
                value={apptForm.notes}
                onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="resize-none text-sm"
                placeholder="Cth: Bawa referensi kain dari Instagram"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setApptModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={apptSaving}>
                {apptSaving ? "Menyimpan..." : "Simpan Janji Temu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
