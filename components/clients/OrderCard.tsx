"use client"

import { differenceInDays, format, parseISO } from "date-fns"
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Send,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatRupiah } from "@/lib/templates"
import { cn } from "@/lib/utils"
import type { FullOrder, PaymentStage, ScheduledMessage } from "@/types"

interface OrderCardProps {
  order: FullOrder
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onMarkPaid: (stage: PaymentStage) => void
  onSendNow: (msg: ScheduledMessage) => void
  onCancelMsg: (msg: ScheduledMessage) => void
}

function stageStatusBadge(stage: PaymentStage) {
  if (stage.paid)
    return (
      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
        Lunas ✓
      </Badge>
    )
  const daysLeft = differenceInDays(parseISO(stage.due_date), new Date())
  if (daysLeft < 0)
    return (
      <Badge className="bg-destructive/20 text-destructive border-0 text-xs">
        Menunggak {Math.abs(daysLeft)} hari
      </Badge>
    )
  if (daysLeft <= 3)
    return (
      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-0 text-xs">
        {daysLeft} hari lagi
      </Badge>
    )
  return (
    <Badge variant="outline" className="text-xs">
      {format(parseISO(stage.due_date), "d MMM yyyy")}
    </Badge>
  )
}

function msgStatusBadge(status: string) {
  const map: Record<string, string> = {
    menunggu: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    terkirim: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    gagal: "bg-destructive/20 text-destructive",
    dibatalkan: "bg-muted text-muted-foreground",
  }
  return <Badge className={`border-0 text-xs ${map[status] ?? ""}`}>{status}</Badge>
}

function totalStagesAmount(order: FullOrder) {
  return order.payment_stages.reduce((s, p) => s + p.amount, 0)
}

export default function OrderCard({
  order,
  expanded,
  onToggle,
  onEdit,
  onMarkPaid,
  onSendNow,
  onCancelMsg,
}: OrderCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Order header */}
      <div
        className="px-4 py-3.5 flex items-start justify-between cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={onToggle}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{order.description}</span>
            <Badge variant={order.status === "aktif" ? "secondary" : "outline"} className="text-xs">
              {order.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Rp {formatRupiah(order.total_price)} ·{" "}
            {format(parseISO(order.created_at), "d MMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            Edit
          </Button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-5">
          {/* Payment timeline */}
          {order.payment_stages.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Timeline Pembayaran
              </h3>
              {totalStagesAmount(order) !== order.total_price && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  ⚠ Total tahap Rp {formatRupiah(totalStagesAmount(order))} ≠ harga pesanan Rp{" "}
                  {formatRupiah(order.total_price)}
                </p>
              )}
              <div className="space-y-2">
                {order.payment_stages
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((stage) => (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        {stage.paid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Rp {formatRupiah(stage.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {stageStatusBadge(stage)}
                        {!stage.paid && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => onMarkPaid(stage)}
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Janji Temu
              </h3>
              <div className="space-y-2">
                {order.appointments
                  .sort(
                    (a, b) =>
                      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
                  )
                  .map((appt) => (
                    <div key={appt.id} className="flex items-start gap-2 text-sm">
                      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{appt.title}</span>
                        <span className="text-muted-foreground mx-1">—</span>
                        <span className="text-muted-foreground">
                          {format(parseISO(appt.scheduled_at), "d MMM yyyy, HH:mm")} WIB
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Pesan Terjadwal
              </h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2">
                        Jenis
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">
                        Dijadwalkan
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2">
                        Status
                      </th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {order.scheduled_messages
                      .sort(
                        (a, b) =>
                          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
                      )
                      .map((msg) => (
                        <tr key={msg.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2.5">
                            <div>
                              <p className="font-medium">{msg.message_type.replace(/_/g, " ")}</p>
                              <p className="text-muted-foreground mt-0.5 line-clamp-1">
                                {msg.message_body.slice(0, 60)}...
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                            {format(parseISO(msg.scheduled_at), "d MMM, HH:mm")}
                          </td>
                          <td className="px-3 py-2.5">{msgStatusBadge(msg.status)}</td>
                          <td className="px-3 py-2.5">
                            {msg.status === "menunggu" && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => onSendNow(msg)}
                                  title="Kirim Sekarang"
                                >
                                  <Send className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-destructive"
                                  onClick={() => onCancelMsg(msg)}
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
  )
}
