export interface FonnteWebhookPayload {
  device: string
  sender: string
  message: string
  name?: string
  inboxid?: string
  url?: string
}

export function normalizeWANumber(input: string): string | null {
  if (!input) return null
  let num = String(input).replace(/[\s\-\+\(\)\.]/g, '')
  if (num.startsWith('0')) num = '62' + num.slice(1)
  else if (num.startsWith('8')) num = '62' + num
  else if (num.startsWith('+62')) num = num.slice(1)
  
  if (!/^62[0-9]{8,13}$/.test(num)) return null
  return num
}

const BAILEYS_BASE = (process.env.NEXT_PUBLIC_WA_SERVICE_URL ||
  process.env.WA_SERVICE_URL ||
  'http://localhost:3001').replace(/\/$/, '')

export interface BaileysWebhookPayload {
  userId: string
  sender: string
  message: string
  name: string
  timestamp?: number
  messageId?: string
}

export async function getQRCode(
  userId: string,
): Promise<{ status: string; qr?: string }> {
  const res = await fetch(`${BAILEYS_BASE}/session/${encodeURIComponent(userId)}/qr`, {
    cache: 'no-store',
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`WA service QR failed: ${res.status}`)
  return res.json()
}

export async function getDeviceStatus(
  userId: string,
): Promise<{ connected: boolean; number?: string }> {
  const res = await fetch(`${BAILEYS_BASE}/session/${encodeURIComponent(userId)}/status`)
  if (!res.ok) throw new Error(`WA service status failed: ${res.status}`)
  const data = await res.json()
  return {
    connected: data.status === 'connected' || data.connected === true,
    number: data.number ?? data.device,
  }
}

export async function sendTextMessage(
  userId: string,
  to: string,
  message: string,
): Promise<void> {
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

