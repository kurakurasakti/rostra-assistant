const WA_SERVICE_URL = process.env.WA_SERVICE_URL || 'http://localhost:3001'

export async function sendTextMessage(
  to: string,
  message: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${WA_SERVICE_URL}/session/${userId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message })
    })
    const data = await res.json()
    return data
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function getDeviceStatus(
  userId: string
): Promise<{ connected: boolean; status: string }> {
  try {
    const res = await fetch(`${WA_SERVICE_URL}/session/${userId}/status`)
    return await res.json()
  } catch {
    return { connected: false, status: 'error' }
  }
}

export async function getQRCode(
  userId: string
): Promise<{ qr?: string; status: string }> {
  try {
    const res = await fetch(`${WA_SERVICE_URL}/session/${userId}/qr`)
    return await res.json()
  } catch {
    return { status: 'error' }
  }
}
