import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp'

type EscalationType = 'sensitif' | 'injection'
type NotifType = 'eskalasi' | 'injection'

async function insertNotification(
  userId: string,
  type: NotifType,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await supabase.from('notifications').insert({ user_id: userId, type, title, body, link })
  } catch {
    // Must never crash the main flow
  }
}

export async function sendEscalationNotification(
  userId: string,
  contactName: string,
  messagePreview: string,
  type: EscalationType,
): Promise<void> {
  const preview = messagePreview.length > 80
    ? messagePreview.slice(0, 80) + '...'
    : messagePreview

  const notifType: NotifType = type === 'injection' ? 'injection' : 'eskalasi'
  const notifTitle = type === 'injection'
    ? 'Percobaan manipulasi AI terdeteksi'
    : 'Pesan sensitif perlu perhatian'
  const notifBody = `Dari ${contactName}: "${preview}"`

  // In-app notification (always fires)
  await insertNotification(userId, notifType, notifTitle, notifBody, '/inbox')

  // WA alert (fires only if configured)
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_wa_number, wa_connected')
      .eq('id', userId)
      .single()

    if (!profile?.notification_wa_number || !profile?.wa_connected) return

    const label = type === 'injection'
      ? '⚠️ *Percobaan Manipulasi AI* terdeteksi'
      : '🔔 *Pesan sensitif* perlu perhatian kamu'

    const message = [
      label,
      '',
      `*Dari:* ${contactName}`,
      `*Pesan:* "${preview}"`,
      '',
      'Balas manual di Rostra Inbox.',
    ].join('\n')

    await sendTextMessage(profile.notification_wa_number, message, userId)
  } catch {
    // WA failure must never crash main flow
  }
}
