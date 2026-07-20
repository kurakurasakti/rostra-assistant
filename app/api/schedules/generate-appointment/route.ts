import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { interpolateTemplate } from "@/lib/templates"

const TZ = "Asia/Jakarta"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as { appointment_id: string }
  if (!body.appointment_id)
    return NextResponse.json({ error: "appointment_id required" }, { status: 400 })

  const [apptRes, profileRes, templatesRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, clients(*)")
      .eq("id", body.appointment_id)
      .eq("user_id", user.id)
      .single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("message_templates")
      .select("*")
      .eq("type", "pengingat_janji_temu")
      .or(`user_id.eq.${user.id},is_default.eq.true`),
  ])

  if (!apptRes.data || !profileRes.data) {
    return NextResponse.json({ error: "Appointment or profile not found" }, { status: 404 })
  }

  const appt = apptRes.data
  const client = appt.clients as { id: string; name: string; whatsapp_number: string } | null
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const templates = templatesRes.data ?? []
  const template =
    templates.find((t) => t.user_id === user.id && !t.is_default) ??
    templates.find((t) => t.is_default)
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })

  const apptTime = new Date(appt.scheduled_at)
  const scheduledAt = new Date(apptTime.getTime() - appt.reminder_hours_before * 60 * 60 * 1000)

  if (scheduledAt <= new Date()) {
    return NextResponse.json({ count: 0, messages: [], reason: "already_past" })
  }

  const zoned = toZonedTime(apptTime, TZ)
  const scheduledDate = format(zoned, "d MMM yyyy, HH:mm") + " WIB"

  const messageBody = interpolateTemplate(template.body, {
    client_name: client.name,
    business_name: profileRes.data.business_name,
    appointment_title: appt.title,
    scheduled_date: scheduledDate,
    location: appt.location ?? "",
  })

  const { data: inserted, error } = await supabase
    .from("scheduled_messages")
    .insert({
      user_id: user.id,
      order_id: null,
      client_id: client.id,
      appointment_id: appt.id,
      message_type: "pengingat_janji_temu",
      whatsapp_number: client.whatsapp_number,
      message_body: messageBody,
      scheduled_at: scheduledAt.toISOString(),
      status: "menunggu",
    })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ count: 1, messages: inserted })
}
