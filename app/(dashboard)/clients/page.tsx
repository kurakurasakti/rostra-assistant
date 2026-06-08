'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Search, Users, Upload, UserPlus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { normalizeWANumber } from '@/lib/whatsapp'
import type { Client } from '@/types'

interface ClientWithCount extends Client {
  active_order_count: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formWA, setFormWA] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [waError, setWaError] = useState('')

  async function loadClients() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [clientsRes, ordersRes] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('client_id').eq('user_id', user.id).eq('status', 'aktif'),
    ])

    const countMap: Record<string, number> = {}
    for (const o of ordersRes.data ?? []) {
      countMap[o.client_id] = (countMap[o.client_id] ?? 0) + 1
    }

    setClients((clientsRes.data ?? []).map(c => ({ ...c, active_order_count: countMap[c.id] ?? 0 })))
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  function resetForm() {
    setFormName(''); setFormWA(''); setFormEmail(''); setFormNotes(''); setWaError('')
  }

  function handleWABlur() {
    if (!formWA.trim()) { setWaError(''); return }
    const normalized = normalizeWANumber(formWA)
    if (!normalized) {
      setWaError('Format nomor tidak valid')
    } else {
      setFormWA(normalized)
      setWaError('')
    }
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizeWANumber(formWA)
    if (!normalized) { setWaError('Format nomor tidak valid'); return }

    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Duplicate check
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('whatsapp_number', normalized)
      .maybeSingle()

    if (existing) {
      toast.error('Nomor WhatsApp sudah terdaftar.')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('clients').insert({
      user_id: user.id,
      name: formName.trim(),
      whatsapp_number: normalized,
      email: formEmail.trim() || null,
      notes: formNotes.trim() || null,
    })

    if (error) {
      toast.error('Gagal menambah klien.')
    } else {
      toast.success(`Klien "${formName}" berhasil ditambahkan.`)
      setSheetOpen(false)
      resetForm()
      loadClients()
    }
    setSubmitting(false)
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.whatsapp_number.includes(q)
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Klien</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients.length} klien terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/import" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 h-9')}>
            <Upload className="w-4 h-4" />
            Import Excel
          </Link>
          <Sheet open={sheetOpen} onOpenChange={open => { setSheetOpen(open); if (!open) resetForm() }}>
            <SheetTrigger className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 h-9')}>
              <Plus className="w-4 h-4" />
              Tambah Klien
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <SheetTitle className="font-display font-semibold text-lg">Tambah Klien Baru</SheetTitle>
                <SheetDescription>Isi data klien untuk ditambahkan ke daftar.</SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <form onSubmit={handleAddClient} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Nama Lengkap <span className="text-destructive">*</span></Label>
                    <Input
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Contoh: Siti Rahayu"
                      required
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Nomor WhatsApp <span className="text-destructive">*</span></Label>
                    <Input
                      value={formWA}
                      onChange={e => { setFormWA(e.target.value); setWaError('') }}
                      onBlur={handleWABlur}
                      placeholder="08123456789 atau 628123456789"
                      required
                      className={`h-10 ${waError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {waError
                      ? <p className="text-xs text-destructive">{waError}</p>
                      : <p className="text-xs text-muted-foreground">Otomatis diformat ke 628xxx.</p>
                    }
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Email <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
                    </Label>
                    <Input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="siti@email.com"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Catatan <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
                    </Label>
                    <Textarea
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="Preferensi, ukuran, catatan khusus, dll."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" className="w-full h-10" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Tambah Klien
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau nomor WhatsApp..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border">
          <div className="bg-muted/50 rounded-full p-3 mb-3">
            <UserPlus className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search ? 'Klien tidak ditemukan' : 'Belum ada klien'}
          </p>
          {!search && (
            <p className="text-xs text-muted-foreground mt-1">Klik "Tambah Klien" untuk mulai.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Nama</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">No. WhatsApp</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Pesanan Aktif</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Ditambahkan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((client, i) => (
                <tr
                  key={client.id}
                  style={{ '--stagger-i': i } as CSSProperties}
                  className="animate-stagger-item hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/clients/${client.id}`}
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {client.name}
                    </Link>
                    {client.email && (
                      <p className="text-xs text-muted-foreground mt-0.5">{client.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                    {client.whatsapp_number}
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    {client.active_order_count > 0 ? (
                      <Badge variant="secondary" className="text-xs">
                        {client.active_order_count} aktif
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs hidden md:table-cell">
                    {format(new Date(client.created_at), 'd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
