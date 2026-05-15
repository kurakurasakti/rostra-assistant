'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp,
  CalendarDays, MessageSquare, CheckCircle2, Clock, AlertCircle,
  Send, X, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import { normalizeWANumber } from '@/lib/whatsapp'
import { formatRupiah } from '@/lib/templates'
import type { Client, Order, PaymentStage, Appointment, ScheduledMessage, OrderStatus, PaymentStageForm, AppointmentForm } from '@/types'

type FullOrder = Order & {
  payment_stages: PaymentStage[]
  appointments: Appointment[]
  scheduled_messages: ScheduledMessage[]
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const clientId = params.id

  const [client, setClient] = useState<Client | null>(null)
  const [orders, setOrders] = useState<FullOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // Profile edit state
  const [editName, setEditName] = useState('')
  const [editWA, setEditWA] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editAINotes, setEditAINotes] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Order form state
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<FullOrder | null>(null)
  const [orderDesc, setOrderDesc] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('aktif')
  const [orderNotes, setOrderNotes] = useState('')
  const [stages, setStages] = useState<PaymentStageForm[]>([])
  const [appointments, setAppointments] = useState<AppointmentForm[]>([])
  const [savingOrder, setSavingOrder] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [clientRes, ordersRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).eq('user_id', user.id).single(),
      supabase
        .from('orders')
        .select('*, payment_stages(*), appointments(*), scheduled_messages(*)')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    if (!clientRes.data) { router.push('/clients'); return }

    const c = clientRes.data
    setClient(c)
    setEditName(c.name); setEditWA(c.whatsapp_number)
    setEditEmail(c.email ?? ''); setEditNotes(c.notes ?? ''); setEditAINotes(c.ai_notes ?? '')
    setOrders(ordersRes.data ?? [])
    setLoading(false)
  }, [clientId, router])

  useEffect(() => { loadData() }, [loadData])

  // --- Profile save ---
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizeWANumber(editWA)
    if (!normalized) { toast.error('Format nomor WA tidak valid'); return }

    setSavingProfile(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('clients').update({
      name: editName.trim(),
      whatsapp_number: normalized,
      email: editEmail.trim() || null,
      notes: editNotes.trim() || null,
      ai_notes: editAINotes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', clientId)

    if (error) toast.error('Gagal menyimpan.')
    else { toast.success('Profil klien diperbarui.'); loadData() }
    setSavingProfile(false)
  }

  // --- Order form helpers ---
  function newStage(): PaymentStageForm {
    return { tempId: crypto.randomUUID(), name: '', amount: '', due_date: '', reminder_days_before: 3 }
  }
  function newAppt(): AppointmentForm {
    return { tempId: crypto.randomUUID(), title: '', scheduled_at: '', location: '', reminder_hours_before: 24, notes: '' }
  }

  function openNewOrder() {
    setEditingOrder(null)
    setOrderDesc(''); setOrderPrice(''); setOrderStatus('aktif'); setOrderNotes('')
    setStages([newStage()]); setAppointments([])
    setOrderModalOpen(true)
  }

  function openEditOrder(order: FullOrder) {
    setEditingOrder(order)
    setOrderDesc(order.description)
    setOrderPrice(formatRupiah(order.total_price))
    setOrderStatus(order.status)
    setOrderNotes(order.notes ?? '')
    setStages(order.payment_stages
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(s => ({
        tempId: s.id,
        name: s.name,
        amount: formatRupiah(s.amount),
        due_date: s.due_date,
        reminder_days_before: s.reminder_days_before,
      })))
    setAppointments(order.appointments.map(a => ({
      tempId: a.id,
      title: a.title,
      scheduled_at: a.scheduled_at.slice(0, 16),
      location: a.location ?? '',
      reminder_hours_before: a.reminder_hours_before,
      notes: a.notes ?? '',
    })))
    setOrderModalOpen(true)
  }

  async function handleSaveOrder(e: React.FormEvent) {
    e.preventDefault()
    setSavingOrder(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const totalPrice = Number(orderPrice.replace(/\D/g, ''))
    if (isNaN(totalPrice) || totalPrice <= 0) {
      toast.error('Total harga tidak valid'); setSavingOrder(false); return
    }

    // 1. Upsert order
    let orderId = editingOrder?.id
    if (orderId) {
      await supabase.from('orders').update({
        description: orderDesc.trim(),
        total_price: totalPrice,
        status: orderStatus,
        notes: orderNotes.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', orderId)
    } else {
      const { data: newOrder, error } = await supabase.from('orders').insert({
        user_id: user.id,
        client_id: clientId,
        description: orderDesc.trim(),
        total_price: totalPrice,
        status: orderStatus,
        notes: orderNotes.trim() || null,
      }).select().single()
      if (error || !newOrder) { toast.error('Gagal membuat pesanan.'); setSavingOrder(false); return }
      orderId = newOrder.id
    }

    // 2. Replace payment stages
    await supabase.from('payment_stages').delete().eq('order_id', orderId)
    if (stages.length > 0) {
      await supabase.from('payment_stages').insert(stages.map((s, i) => ({
        order_id: orderId,
        user_id: user.id,
        name: s.name.trim(),
        amount: Number(s.amount.replace(/\D/g, '')),
        due_date: s.due_date,
        reminder_days_before: s.reminder_days_before,
        sort_order: i,
        paid: false,
      })))
    }

    // 3. Replace appointments
    await supabase.from('appointments').delete().eq('order_id', orderId)
    if (appointments.length > 0) {
      await supabase.from('appointments').insert(appointments.map(a => ({
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

    // 4. Cancel pending scheduled messages
    await supabase
      .from('scheduled_messages')
      .update({ status: 'dibatalkan' })
      .eq('order_id', orderId)
      .eq('status', 'menunggu')

    // 5. Generate new scheduled messages
    let scheduledCount = 0
    try {
      const res = await fetch('/api/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      const data = await res.json()
      scheduledCount = data.count ?? 0
    } catch {
      // Non-fatal: message scheduling failed
    }

    toast.success(`Pesanan disimpan. ${scheduledCount} pesan otomatis dijadwalkan.`)
    setOrderModalOpen(false)
    loadData()
    setSavingOrder(false)
  }

  // --- Payment stage actions ---
  async function handleMarkPaid(stage: PaymentStage) {
    const supabase = createClient()
    await supabase.from('payment_stages').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', stage.id)
    await supabase.from('scheduled_messages').update({ status: 'dibatalkan' })
      .eq('payment_stage_id', stage.id).eq('status', 'menunggu')
    toast.success(`${stage.name} ditandai lunas.`)
    loadData()
  }

  async function handleSendNow(msg: ScheduledMessage) {
    const res = await fetch('/api/scheduled-messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: msg.id }),
    })
    if (res.ok) { toast.success('Pesan berhasil dikirim.'); loadData() }
    else { const d = await res.json(); toast.error(d.error ?? 'Gagal mengirim.') }
  }

  async function handleCancelMsg(msg: ScheduledMessage) {
    const supabase = createClient()
    await supabase.from('scheduled_messages').update({ status: 'dibatalkan' }).eq('id', msg.id)
    toast.success('Pesan dibatalkan.')
    loadData()
  }

  // --- Helpers ---
  function stageStatusBadge(stage: PaymentStage) {
    if (stage.paid) return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-0 text-xs">Lunas ✓</Badge>
    const daysLeft = differenceInDays(parseISO(stage.due_date), new Date())
    if (daysLeft < 0) return <Badge className="bg-destructive/20 text-destructive border-0 text-xs">Menunggak {Math.abs(daysLeft)} hari</Badge>
    if (daysLeft <= 3) return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-0 text-xs">{daysLeft} hari lagi</Badge>
    return <Badge variant="outline" className="text-xs">{format(parseISO(stage.due_date), 'd MMM yyyy')}</Badge>
  }

  function msgStatusBadge(status: string) {
    const map: Record<string, string> = {
      menunggu: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
      terkirim: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      gagal: 'bg-destructive/20 text-destructive',
      dibatalkan: 'bg-muted text-muted-foreground',
    }
    return <Badge className={`border-0 text-xs ${map[status] ?? ''}`}>{status}</Badge>
  }

  if (loading) return (
    <div className="p-6 lg:p-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )

  if (!client) return null

  const totalStagesAmount = (order: FullOrder) =>
    order.payment_stages.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 px-2')}>
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
          <TabsTrigger value="messages" disabled>Riwayat Pesan</TabsTrigger>
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
              <Textarea
                value={editAINotes}
                onChange={e => setEditAINotes(e.target.value)}
                placeholder="Contoh: Pelanggan VIP, boleh diskon max 10%. Panggil dengan nama."
                rows={2}
                className="resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">Catatan ini dibaca AI setiap kali membalas pesan klien ini.</p>
            </div>
            <div className="flex justify-between items-center pt-1">
              <p className="text-xs text-muted-foreground">Klien sejak {format(parseISO(client.created_at), 'd MMM yyyy')}</p>
              <Button type="submit" size="sm" disabled={savingProfile}>
                {savingProfile ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Orders */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={openNewOrder}>
              <Plus className="w-4 h-4" />
              Buat Pesanan
            </Button>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Belum ada pesanan</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div
                  className="px-4 py-3.5 flex items-start justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{order.description}</span>
                      <Badge
                        variant={order.status === 'aktif' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Rp {formatRupiah(order.total_price)} · {format(parseISO(order.created_at), 'd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Button
                      variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={e => { e.stopPropagation(); openEditOrder(order) }}
                    >
                      Edit
                    </Button>
                    {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="border-t border-border px-4 py-4 space-y-5">
                    {/* Payment timeline */}
                    {order.payment_stages.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Timeline Pembayaran</h3>
                        {totalStagesAmount(order) !== order.total_price && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                            ⚠ Total tahap Rp {formatRupiah(totalStagesAmount(order))} ≠ harga pesanan Rp {formatRupiah(order.total_price)}
                          </p>
                        )}
                        <div className="space-y-2">
                          {order.payment_stages
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map(stage => (
                              <div key={stage.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                                <div className="flex items-start gap-2">
                                  {stage.paid
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    : <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                  }
                                  <div>
                                    <p className="text-sm font-medium">{stage.name}</p>
                                    <p className="text-xs text-muted-foreground">Rp {formatRupiah(stage.amount)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {stageStatusBadge(stage)}
                                  {!stage.paid && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => handleMarkPaid(stage)}
                                    >
                                      Tandai Lunas
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Appointments */}
                    {order.appointments.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Janji Temu</h3>
                        <div className="space-y-2">
                          {order.appointments
                            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                            .map(appt => (
                              <div key={appt.id} className="flex items-start gap-2 text-sm">
                                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium">{appt.title}</span>
                                  <span className="text-muted-foreground mx-1">—</span>
                                  <span className="text-muted-foreground">
                                    {format(parseISO(appt.scheduled_at), 'd MMM yyyy, HH:mm')} WIB
                                  </span>
                                  {appt.location && (
                                    <span className="text-muted-foreground"> · {appt.location}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Scheduled messages */}
                    {order.scheduled_messages.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pesan Terjadwal</h3>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="border-b border-border bg-muted/30">
                              <tr>
                                <th className="text-left font-medium text-muted-foreground px-3 py-2">Jenis</th>
                                <th className="text-left font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Dijadwalkan</th>
                                <th className="text-left font-medium text-muted-foreground px-3 py-2">Status</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {order.scheduled_messages
                                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                                .map(msg => (
                                  <tr key={msg.id} className="hover:bg-muted/20">
                                    <td className="px-3 py-2.5">
                                      <div>
                                        <p className="font-medium">{msg.message_type.replace(/_/g, ' ')}</p>
                                        <p className="text-muted-foreground mt-0.5 line-clamp-1">{msg.message_body.slice(0, 60)}...</p>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                                      {format(parseISO(msg.scheduled_at), 'd MMM, HH:mm')}
                                    </td>
                                    <td className="px-3 py-2.5">{msgStatusBadge(msg.status)}</td>
                                    <td className="px-3 py-2.5">
                                      {msg.status === 'menunggu' && (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost" size="sm" className="h-6 px-2 text-xs"
                                            onClick={() => handleSendNow(msg)}
                                            title="Kirim Sekarang"
                                          >
                                            <Send className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive"
                                            onClick={() => handleCancelMsg(msg)}
                                            title="Batalkan"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        {/* Tab 3: Message History (Phase 2) */}
        <TabsContent value="messages">
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
            <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Riwayat pesan tersedia di Phase 2</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Order Form Modal */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Edit Pesanan' : 'Buat Pesanan Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveOrder} className="space-y-6 mt-2">
            {/* Order info */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Deskripsi Pesanan *</Label>
                <Input
                  value={orderDesc}
                  onChange={e => setOrderDesc(e.target.value)}
                  placeholder="Contoh: Gaun pesta custom 2 pcs"
                  required className="h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Total Harga *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                    <Input
                      value={orderPrice}
                      onChange={e => setOrderPrice(formatRupiahInputLocal(e.target.value))}
                      placeholder="0"
                      required className="h-10 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={orderStatus} onValueChange={v => { if (v) setOrderStatus(v as OrderStatus) }}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="selesai">Selesai</SelectItem>
                      <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Catatan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2} className="resize-none text-sm" />
              </div>
            </div>

            <Separator />

            {/* Payment stages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Tahap Pembayaran</h3>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setStages(s => [...s, newStage()])}>
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              </div>
              {stages.length === 0 && <p className="text-xs text-muted-foreground">Tidak ada tahap pembayaran.</p>}
              {stages.map((stage, i) => (
                <div key={stage.tempId} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Tahap {i + 1}</span>
                    <Button
                      type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                      onClick={() => setStages(s => s.filter(x => x.tempId !== stage.tempId))}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nama *</Label>
                      <Input
                        value={stage.name}
                        onChange={e => setStages(s => s.map(x => x.tempId === stage.tempId ? { ...x, name: e.target.value } : x))}
                        placeholder="DP 1"
                        required className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Jumlah *</Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                        <Input
                          value={stage.amount}
                          onChange={e => setStages(s => s.map(x => x.tempId === stage.tempId ? { ...x, amount: formatRupiahInputLocal(e.target.value) } : x))}
                          required className="h-8 text-sm pl-8"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Jatuh Tempo *</Label>
                      <Input
                        type="date"
                        value={stage.due_date}
                        onChange={e => setStages(s => s.map(x => x.tempId === stage.tempId ? { ...x, due_date: e.target.value } : x))}
                        required className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ingatkan X hari sebelum</Label>
                      <Input
                        type="number" min={1} max={30}
                        value={stage.reminder_days_before}
                        onChange={e => setStages(s => s.map(x => x.tempId === stage.tempId ? { ...x, reminder_days_before: Number(e.target.value) } : x))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Appointments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Janji Temu</h3>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAppointments(a => [...a, newAppt()])}>
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              </div>
              {appointments.length === 0 && <p className="text-xs text-muted-foreground">Tidak ada janji temu.</p>}
              {appointments.map((appt, i) => (
                <div key={appt.tempId} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Janji {i + 1}</span>
                    <Button
                      type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                      onClick={() => setAppointments(a => a.filter(x => x.tempId !== appt.tempId))}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Judul *</Label>
                      <Input
                        value={appt.title}
                        onChange={e => setAppointments(a => a.map(x => x.tempId === appt.tempId ? { ...x, title: e.target.value } : x))}
                        placeholder="Fitting 1"
                        required className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tanggal & Waktu *</Label>
                      <Input
                        type="datetime-local"
                        value={appt.scheduled_at}
                        onChange={e => setAppointments(a => a.map(x => x.tempId === appt.tempId ? { ...x, scheduled_at: e.target.value } : x))}
                        required className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Lokasi <span className="text-muted-foreground">(opsional)</span></Label>
                      <Input
                        value={appt.location}
                        onChange={e => setAppointments(a => a.map(x => x.tempId === appt.tempId ? { ...x, location: e.target.value } : x))}
                        placeholder="Jl. Sudirman No.1"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ingatkan X jam sebelum</Label>
                      <Input
                        type="number" min={1} max={72}
                        value={appt.reminder_hours_before}
                        onChange={e => setAppointments(a => a.map(x => x.tempId === appt.tempId ? { ...x, reminder_hours_before: Number(e.target.value) } : x))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOrderModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={savingOrder}>
                {savingOrder ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : 'Simpan Pesanan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Local formatRupiahInput (avoid importing from whatsapp.ts which is server-side)
function formatRupiahInputLocal(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID').format(Number(digits))
}
