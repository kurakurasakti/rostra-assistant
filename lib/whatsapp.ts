const FONNTE_BASE = 'https://api.fonnte.com'

export async function sendTextMessage(
  to: string,
  message: string,
  deviceToken: string,
): Promise<void> {
  const res = await fetch(`${FONNTE_BASE}/send`, {
    method: 'POST',
    headers: {
      Authorization: deviceToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target: to, message }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Fonnte send failed ${res.status}: ${text}`)
  }
}

export function normalizeWANumber(input: string): string | null {
  if (!input) return null

  let cleaned = input.trim()

  // Handle scientific notation from Excel (e.g. 6.28E+11)
  if (/^\d+\.?\d*[eE][+]?\d+$/.test(cleaned)) {
    try {
      cleaned = String(Math.round(Number(cleaned)))
    } catch {
      return null
    }
  }

  cleaned = cleaned.replace(/[^\d]/g, '')
  if (!cleaned) return null

  if (cleaned.startsWith('62')) {
    return cleaned.length >= 10 ? cleaned : null
  }
  if (cleaned.startsWith('0')) {
    const result = '62' + cleaned.slice(1)
    return result.length >= 10 ? result : null
  }
  if (cleaned.startsWith('8')) {
    const result = '62' + cleaned
    return result.length >= 10 ? result : null
  }

  return null
}

export async function getDeviceStatus(
  deviceToken: string,
): Promise<{ connected: boolean; number?: string }> {
  const res = await fetch(`${FONNTE_BASE}/device`, {
    method: 'POST',
    headers: { Authorization: deviceToken },
  })
  if (!res.ok) return { connected: false }
  const data = await res.json()

  // Device token response: { status: true, device: "628xxx", name: "...", ... }
  // Master token response: { status: true, device: [{ device: "628xxx", status: "connect", ... }] }
  if (Array.isArray(data.device)) {
    const device = data.device[0]
    const connected = !!device?.status && device.status !== 'disconnect'
    return { connected, number: device?.device ?? undefined }
  }

  const connected = data.status === true
  const number = typeof data.device === 'string' ? data.device : undefined
  return { connected, number }
}
