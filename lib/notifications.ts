import { createClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp'

type EscalationType = 'sensitif' | 'injection'

export async function sendEscalationNotification(
  userId: string,
  contactName: string,
  messagePreview: string,
  type: EscalationType,
): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_wa_number, wa_connected, business_name')
      .eq('id', userId)
      .single()

    if (!profile?.notification_wa_number || !profile?.wa_connected) return

    const preview = messagePreview.length > 80
      ? messagePreview.slice(0, 80) + '...'
      : messagePreview

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
    // Notification failure must never crash the main flow
  }
}
