"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { formatRupiah } from "@/lib/templates"
import type { OrderStatus, PaymentStageForm, AppointmentForm, FullOrder } from "@/types"

interface OrderFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingOrder: FullOrder | null
  onSave: (data: {
    description: string
    totalPrice: number
    status: OrderStatus
    notes: string
    stages: PaymentStageForm[]
    appointments: AppointmentForm[]
  }) => Promise<void>
}

function newStage(): PaymentStageForm {
  return { tempId: crypto.randomUUID(), name: "", amount: "", due_date: "", reminder_days_before: 3 }
}

function newAppt(): AppointmentForm {
  return { tempId: crypto.randomUUID(), title: "", scheduled_at: "", location: "", reminder_hours_before: 24, notes: "" }
}

function formatRupiahInput(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  return new Intl.NumberFormat("id-ID").format(Number(digits))
}

export default function OrderFormModal({
  open,
  onOpenChange,
  editingOrder,
  onSave,
}: OrderFormModalProps) {
  const [orderDesc, setOrderDesc] = useState(editingOrder?.description ?? "")
  const [orderPrice, setOrderPrice] = useState(editingOrder ? formatRupiah(editingOrder.total_price) : "")
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(editingOrder?.status ?? "aktif")
  const [orderNotes, setOrderNotes] = useState(editingOrder?.notes ?? "")
  const [stages, setStages] = useState<PaymentStageForm[]>(
    editingOrder
      ? editingOrder.payment_stages
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(s => ({
            tempId: s.id,
            name: s.name,
            amount: formatRupiah(s.amount),
            due_date: s.due_date,
            reminder_days_before: s.reminder_days_before,
          }))
      : [newStage()],
  )
  const [apptList, setApptList] = useState<AppointmentForm[]>(
    editingOrder
      ? editingOrder.appointments.map(a => ({
          tempId: a.id,
          title: a.title,
          scheduled_at: a.scheduled_at.slice(0, 16),
          location: a.location ?? "",
          reminder_hours_before: a.reminder_hours_before,
          notes: a.notes ?? "",
        }))
      : [],
  )
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setOrderDesc("")
    setOrderPrice("")
    setOrderStatus("aktif")
    setOrderNotes("")
    setStages([newStage()])
    setApptList([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const totalPrice = Number(orderPrice.replace(/\D/g, ""))
    if (isNaN(totalPrice) || totalPrice <= 0) return
    setSaving(true)
    await onSave({
      description: orderDesc.trim(),
      totalPrice,
      status: orderStatus,
      notes: orderNotes.trim() || null as unknown as string,
      stages,
      appointments: apptList,
    })
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingOrder ? "Edit Pesanan" : "Buat Pesanan Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Order info */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Deskripsi Pesanan *</Label>
              <Input value={orderDesc} onChange={e => setOrderDesc(e.target.value)} placeholder="Contoh: Gaun pesta custom 2 pcs" required className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Harga *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                  <Input value={orderPrice} onChange={e => setOrderPrice(formatRupiahInput(e.target.value))} placeholder="0" required className="h-10 pl-9" />
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
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setStages(s => s.filter(x => x.tempId !== stage.tempId))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nama *</Label>
                    <Input value={stage.name} onChange={e => setStages(s => s.map(x => x.tempId === stage.tempId ? { ...x, name: e.target.value } : x))} placeholder="DP 1" required className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Jumlah *</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                      <Input value={stage.amount} onChange={e => setStages(s => s.map(x => x.tempId === stage.tempId ? { ...x, amount: formatRupiahInput(e.target.value) } : x))} required className="h-8 text-sm pl-8" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Jatuh Tempo *</Label>
                    <Input type="date" value={stage.due_date} onChange={e => setStages(s => s.map(x => x.tempId === stage.tempId ? { ...x, due_date: e.target.value } : x))} required className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ingatkan X hari sebelum</Label>
                    <Input type="number" min={1} max={30} value={stage.reminder_days_before} onChange={e => setStages(s => s.map(x => x.tempId === stage.tempId ? { ...x, reminder_days_before: Number(e.target.value) } : x))} className="h-8 text-sm" />
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
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setApptList(a => [...a, newAppt()])}>
                <Plus className="w-3 h-3" /> Tambah
              </Button>
            </div>
            {apptList.length === 0 && <p className="text-xs text-muted-foreground">Tidak ada janji temu.</p>}
            {apptList.map((appt, i) => (
              <div key={appt.tempId} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Janji {i + 1}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setApptList(a => a.filter(x => x.tempId !== appt.tempId))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Judul *</Label>
                    <Input value={appt.title} onChange={e => setApptList(a => a.map(x => x.tempId === appt.tempId ? { ...x, title: e.target.value } : x))} placeholder="Fitting 1" required className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tanggal & Waktu *</Label>
                    <Input type="datetime-local" value={appt.scheduled_at} onChange={e => setApptList(a => a.map(x => x.tempId === appt.tempId ? { ...x, scheduled_at: e.target.value } : x))} required className="h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Lokasi <span className="text-muted-foreground">(opsional)</span></Label>
                    <Input value={appt.location} onChange={e => setApptList(a => a.map(x => x.tempId === appt.tempId ? { ...x, location: e.target.value } : x))} placeholder="Jl. Sudirman No.1" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ingatkan X jam sebelum</Label>
                    <Input type="number" min={1} max={72} value={appt.reminder_hours_before} onChange={e => setApptList(a => a.map(x => x.tempId === appt.tempId ? { ...x, reminder_hours_before: Number(e.target.value) } : x))} className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Pesanan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
