export interface FonnteWebhookPayload {
  device: string
  sender: string
  message: string
  name?: string
  inboxid?: string
  url?: string
}

export interface BaileysWebhookPayload {
  userId: string
  sender: string
  message: string
  name: string
  timestamp?: number
  messageId?: string
}

const BAILEYS_BASE = (process.env.NEXT_PUBLIC_WA_SERVICE_URL ||
  process.env.WA_SERVICE_URL ||
  'http://localhost:3001').replace(/\/$/, '')

export async function sendTextMessage(
  arg1: string,
  arg2: string,
  arg3: string,
): Promise<void> {
  let to: string
  let message: string
  let userId: string

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg1)
  if (isUuid) {
    // (userId, to, message)
    userId = arg1
    to = arg2
    message = arg3
  } else {
    // (to, message, userId)
    to = arg1
    message = arg2
    userId = arg3
  }

  const res = await fetch(`${BAILEYS_BASE}/session/${encodeURIComponent(userId)}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => 'WA send failed')
    throw new Error(`WA send failed ${res.status}: ${text}`)
  }
}

export async function fetchChatHistory(
  userId: string,
  chatJid: string,
  oldestMsgKey: { remoteJid: string; fromMe: boolean; id: string },
  oldestMsgTimestampMs: number,
  count = 5,
): Promise<{ success: boolean; count?: number }> {
  const res = await fetch(`${BAILEYS_BASE}/session/${encodeURIComponent(userId)}/fetch-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatJid, oldestMsgKey, oldestMsgTimestamp: oldestMsgTimestampMs, count }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WA service fetch-history failed ${res.status}: ${text}`)
  }
  return res.json()
}

export function normalizeWANumber(input: string): string | null {
  if (!input) return null
  let cleaned = input.trim()

  // WhatsApp JID formats from Baileys
  if (cleaned.endsWith('@lid')) {
    const id = cleaned.slice(0, -4)
    return id.length > 0 ? id + '@lid' : null
  }
  if (cleaned.endsWith('@s.whatsapp.net')) {
    cleaned = cleaned.slice(0, -15)
  }

  // Handle scientific notation from Excel (e.g., 6.28E+11, 8.12E+09)
  if (/^\d+\.?\d*[eE][+]?\d+$/.test(cleaned)) {
    try {
      const num = Number(cleaned)
      const rounded = Math.round(num)
      const roundedStr = String(rounded)
      if (/0{4,}$/.test(roundedStr)) {
        console.warn(
          `[normalizeWANumber] Scientific notation "${input}" converted to ` +
          `"${roundedStr}" but appears truncated (Excel precision loss). Returning null.`,
        )
        return null
      }
      cleaned = roundedStr
    } catch {
      return null
    }
  }

  // Strip all non-digit characters
  cleaned = cleaned.replace(/[^\d]/g, '')
  if (!cleaned) return null

  // Handle international dialing prefixes
  if (cleaned.startsWith('0062')) {
    cleaned = cleaned.slice(2)
  } else if (cleaned.startsWith('01162')) {
    cleaned = cleaned.slice(3)
  } else if (cleaned.startsWith('00') || cleaned.startsWith('011')) {
    return null
  }

  if (cleaned.startsWith('62')) {
    return cleaned.length >= 10 && cleaned.length <= 15 ? cleaned : null
  }
  if (cleaned.startsWith('0')) {
    const result = '62' + cleaned.slice(1)
    return result.length >= 10 && result.length <= 15 ? result : null
  }
  if (cleaned.startsWith('8')) {
    const result = '62' + cleaned
    return result.length >= 10 && result.length <= 15 ? result : null
  }

  return null
}

export async function getDeviceStatus(
  userId: string,
): Promise<{ connected: boolean; number?: string }> {
  try {
    const res = await fetch(`${BAILEYS_BASE}/session/${encodeURIComponent(userId)}/status`)
    if (!res.ok) return { connected: false }
    const data = await res.json()
    return {
      connected: data.status === 'connected' || data.connected === true,
      number: data.number ?? data.device,
    }
  } catch {
    return { connected: false }
  }
}
