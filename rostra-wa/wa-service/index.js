// Load .env file manually — works on all Node versions
const fs = require('fs')
const path = require('path')
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq === -1) return
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) process.env[key] = val
  })
}

const express = require('express')
const makeWASocket = require('@whiskeysockets/baileys').default
const { 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeInMemoryStore
} = require('@whiskeysockets/baileys')
const pino = require('pino')

const app = express()
app.use(express.json())

const sessions = new Map()

const NEXT_APP_URL = process.env.NEXT_APP_URL || 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''
const PORT = process.env.PORT || 3001

async function createSession(userId) {
  const authPath = path.join(__dirname, 'auth', userId)
  
  const { state, saveCreds } = await useMultiFileAuthState(authPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['Rostra', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
  })

  const sessionData = { 
    sock, 
    qr: null, 
    status: 'connecting',
    userId 
  }
  sessions.set(userId, sessionData)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      sessionData.qr = qr
      sessionData.status = 'waiting_scan'
      console.log(`[${userId}] QR ready`)
    }

    if (connection === 'open') {
      sessionData.status = 'connected'
      sessionData.qr = null
      const jid = sock.user?.id ?? ''
      const number = jid ? jid.split(':')[0].split('@')[0] : null
      console.log(`[${userId}] Connected as ${number ?? 'unknown'}`)

      fetch(`${NEXT_APP_URL}/api/whatsapp/connected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, number: number ?? '' }),
      })
        .then(r => console.log(`[${userId}] /connected callback: ${r.status}`))
        .catch(err => console.error(`[${userId}] /connected callback error:`, err))
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      sessionData.status = 'disconnected'
      console.log(`[${userId}] Disconnected. Reconnect: ${shouldReconnect}`)

      // Notify Next.js so wa_connected resets to false in DB
      fetch(`${NEXT_APP_URL}/api/whatsapp/disconnected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, willReconnect: shouldReconnect }),
      }).catch(() => {})

      if (shouldReconnect) {
        setTimeout(() => createSession(userId), 3000)
      } else {
        sessions.delete(userId)
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`[${userId}] messages.upsert type=${type} count=${messages.length}`)
    if (type !== 'notify') return

    for (const msg of messages) {
      console.log(`[${userId}] msg fromMe=${msg.key.fromMe} remoteJid=${msg.key.remoteJid} hasMessage=${!!msg.message}`)
      if (msg.key.fromMe) continue
      if (!msg.message) continue

      const m = msg.message
      const text = m?.conversation
        || m?.extendedTextMessage?.text
        || m?.imageMessage?.caption
        || m?.videoMessage?.caption
        || m?.documentMessage?.caption
        || m?.ephemeralMessage?.message?.conversation
        || m?.ephemeralMessage?.message?.extendedTextMessage?.text
        || m?.viewOnceMessage?.message?.imageMessage?.caption
        || m?.viewOnceMessage?.message?.videoMessage?.caption
        || m?.buttonsResponseMessage?.selectedDisplayText
        || m?.listResponseMessage?.title
        || m?.templateButtonReplyMessage?.selectedDisplayText
        || ''

      if (!text) continue

      const sender = msg.key.remoteJid ?? ''
      const senderName = msg.pushName || sender

      console.log(`[wa-service] message from ${sender}: "${text.slice(0, 60)}"`)
      console.log(`[wa-service] forwarding to ${NEXT_APP_URL}/api/webhook/whatsapp`)

      fetch(`${NEXT_APP_URL}/api/webhook/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-webhook-secret': WEBHOOK_SECRET },
        body: JSON.stringify({
          userId,
          sender,
          message: text,
          name: senderName,
          timestamp: msg.messageTimestamp,
          messageId: msg.key.id,
        })
      })
        .then(res => console.log(`[wa-service] webhook response: ${res.status}`))
        .catch(err => console.error('[wa-service] webhook forward error:', err))
    }
  })

  return sessionData
}

async function loadExistingSessions() {
  const authDir = path.join(__dirname, 'auth')
  
  if (!fs.existsSync(authDir)) return
  
  const userIds = fs.readdirSync(authDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
  console.log(`[startup] Loading ${userIds.length} existing sessions...`)
  
  for (const userId of userIds) {
    await createSession(userId)
  }
}

app.post('/session/:userId/connect', async (req, res) => {
  const { userId } = req.params
  const QRCode = require('qrcode')

  let sessionData
  const authPath = path.join(__dirname, 'auth', userId)

  if (sessions.has(userId)) {
    sessionData = sessions.get(userId)
    if (sessionData.status === 'connected') {
      return res.json({ status: 'connected' })
    }
    if (sessionData.qr) {
      const qr = await QRCode.toDataURL(sessionData.qr)
      return res.json({ status: 'waiting_scan', qr })
    }
    // Session in memory but disconnected/stuck — remove it and start fresh
    sessions.delete(userId)
  }

  // Delete stale auth so Baileys generates a new QR instead of trying to resume logged-out session
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true })
    console.log(`[${userId}] Cleared stale auth, starting fresh session`)
  }

  sessionData = await createSession(userId)

  // Wait up to 30s for QR or connected (network can be slow on fetchLatestBaileysVersion)
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (sessionData.qr || sessionData.status === 'connected') {
        clearInterval(check)
        resolve()
      }
    }, 500)
    setTimeout(() => { clearInterval(check); resolve() }, 30000)
  })

  if (sessionData.status === 'connected') {
    return res.json({ status: 'connected' })
  }

  if (!sessionData.qr) {
    return res.status(504).json({ error: 'QR timeout — coba lagi' })
  }

  const qr = await QRCode.toDataURL(sessionData.qr)
  res.json({ status: 'waiting_scan', qr })
})

app.get('/session/:userId/qr', async (req, res) => {
  const session = sessions.get(req.params.userId)
  
  if (!session) {
    return res.json({ status: 'not_found' })
  }
  
  if (session.status === 'connected') {
    return res.json({ status: 'connected' })
  }

  if (!session.qr) {
    return res.json({ status: 'waiting', message: 'QR belum siap, coba lagi 2 detik' })
  }

  try {
    const QRCode = require('qrcode')
    const qrBase64 = await QRCode.toDataURL(session.qr)
    res.json({ status: 'waiting_scan', qr: qrBase64 })
  } catch {
    res.json({ status: 'waiting_scan', qr: session.qr })
  }
})

app.get('/session/:userId/status', (req, res) => {
  const session = sessions.get(req.params.userId)

  if (!session) {
    return res.json({ status: 'not_found', connected: false })
  }

  const jid = session.sock?.user?.id ?? ''
  const number = jid ? jid.split(':')[0].split('@')[0] : undefined

  res.json({
    status: session.status,
    connected: session.status === 'connected',
    number: number || undefined
  })
})

app.post('/session/:userId/send', async (req, res) => {
  const session = sessions.get(req.params.userId)
  
  if (!session || session.status !== 'connected') {
    return res.status(400).json({ success: false, error: 'Session tidak connected' })
  }

  const { to, message } = req.body
  
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'to dan message wajib diisi' })
  }

  try {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
    const sendOnce = () => session.sock.sendMessage(jid, { text: message })
    try {
      await sendOnce()
    } catch (firstErr) {
      if (String(firstErr).includes('Connection Closed')) {
        console.log(`[${req.params.userId}] Connection Closed on send, retry in 3s...`)
        await new Promise(r => setTimeout(r, 3000))
        await sendOnce()
      } else {
        throw firstErr
      }
    }
    res.json({ success: true })
  } catch (err) {
    console.error(`[${req.params.userId}] Send error:`, err)
    res.status(500).json({ success: false, error: String(err) })
  }
})

app.post('/session/:userId/disconnect', async (req, res) => {
  const session = sessions.get(req.params.userId)
  
  if (!session) {
    return res.json({ success: true, message: 'Session tidak ditemukan' })
  }

  await session.sock.logout()
  sessions.delete(req.params.userId)
  res.json({ success: true })
})

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    sessions: sessions.size,
    active: [...sessions.entries()].map(([id, s]) => ({
      userId: id, 
      status: s.status
    }))
  })
})

loadExistingSessions().then(() => {
  app.listen(PORT, () => {
    console.log(`WA Service running at http://localhost:${PORT}`)
    console.log(`   Health: http://localhost:${PORT}/health`)
  })
})
