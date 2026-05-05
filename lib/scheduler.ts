import type {
  Order,
  Client,
  Profile,
  PaymentStage,
  Appointment,
  MessageTemplate,
  MessageStatus,
} from '@/types'
import { interpolateTemplate, formatRupiah } from './templates'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Jakarta'

type ScheduledMessageInsert = {
  user_id: string
  order_id: string
  client_id: string
  payment_stage_id: string | null
  appointment_id: string | null
  message_type: string
  whatsapp_number: string
  message_body: string
  scheduled_at: string
  status: MessageStatus
}

function formatWIB(date: Date): string {
  const zoned = toZonedTime(date, TZ)
  return format(zoned, 'd MMM yyyy, HH:mm') + ' WIB'
}

function makePaymentReminderDate(dueDate: string, daysBefore: number): Date {
  // Parse due_date as YYYY-MM-DD, set 09:00 WIB
  const d = new Date(dueDate + 'T00:00:00')
  d.setDate(d.getDate() - daysBefore)
  const ymd = d.toISOString().slice(0, 10)
  return new Date(`${ymd}T09:00:00+07:00`)
}

export function generateScheduledMessages(
  order: Order,
  client: Client,
  profile: Profile,
  stages: PaymentStage[],
  appointments: Appointment[],
  templates: MessageTemplate[],
): ScheduledMessageInsert[] {
  const now = new Date()
  const result: ScheduledMessageInsert[] = []

  const getTemplate = (type: string) =>
    templates.find(t => t.type === type && !t.is_default) ??
    templates.find(t => t.type === type)

  const baseVars = {
    nama_klien: client.name,
    nama_bisnis: profile.business_name,
    deskripsi_pesanan: order.description,
    total_harga: formatRupiah(order.total_price),
  }

  // 1. Konfirmasi pesanan — now + 5 min
  const konfTpl = getTemplate('konfirmasi_pesanan')
  if (konfTpl) {
    const scheduledAt = new Date(now.getTime() + 5 * 60 * 1000)
    result.push({
      user_id: order.user_id,
      order_id: order.id,
      client_id: client.id,
      payment_stage_id: null,
      appointment_id: null,
      message_type: 'konfirmasi_pesanan',
      whatsapp_number: client.whatsapp_number,
      message_body: interpolateTemplate(konfTpl.body, baseVars),
      scheduled_at: scheduledAt.toISOString(),
      status: 'menunggu',
    })
  }

  // 2. Payment reminders
  const payTpl = getTemplate('pengingat_pembayaran')
  if (payTpl) {
    for (const stage of stages) {
      if (stage.paid) continue
      const scheduledAt = makePaymentReminderDate(stage.due_date, stage.reminder_days_before)
      if (scheduledAt <= now) continue

      const vars = {
        ...baseVars,
        nama_tahap: stage.name,
        jumlah: formatRupiah(stage.amount),
        jatuh_tempo: format(new Date(stage.due_date + 'T00:00:00'), 'd MMM yyyy'),
      }

      result.push({
        user_id: order.user_id,
        order_id: order.id,
        client_id: client.id,
        payment_stage_id: stage.id,
        appointment_id: null,
        message_type: 'pengingat_pembayaran',
        whatsapp_number: client.whatsapp_number,
        message_body: interpolateTemplate(payTpl.body, vars),
        scheduled_at: scheduledAt.toISOString(),
        status: 'menunggu',
      })
    }
  }

  // 3. Appointment reminders
  const apptTpl = getTemplate('pengingat_janji_temu')
  if (apptTpl) {
    for (const appt of appointments) {
      const apptTime = new Date(appt.scheduled_at)
      const scheduledAt = new Date(
        apptTime.getTime() - appt.reminder_hours_before * 60 * 60 * 1000,
      )
      if (scheduledAt <= now) continue

      const vars = {
        ...baseVars,
        judul_janji: appt.title,
        waktu_janji: formatWIB(apptTime),
        lokasi_janji: appt.location ?? '',
      }

      result.push({
        user_id: order.user_id,
        order_id: order.id,
        client_id: client.id,
        payment_stage_id: null,
        appointment_id: appt.id,
        message_type: 'pengingat_janji_temu',
        whatsapp_number: client.whatsapp_number,
        message_body: interpolateTemplate(apptTpl.body, vars),
        scheduled_at: scheduledAt.toISOString(),
        status: 'menunggu',
      })
    }
  }

  return result
}
