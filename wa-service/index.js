const express = require('express')
const makeWASocket = require('@whiskeysockets/baileys').default
const { 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeInMemoryStore
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const path = require('path')

const app = express()
app.use(express.json())

const sessions = new Map()

const NEXT_APP_URL = process.env.NEXT_APP_URL || 'http://localhost:3000'
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
      console.log(`[${userId}] Connected`)
      
      fetch(`${NEXT_APP_URL}/api/whatsapp/connected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      }).catch(() => {})
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      
      sessionData.status = 'disconnected'
      console.log(`[${userId}] Disconnected. Status: ${statusCode}. Reconnect: ${shouldReconnect}`)
      
      try {
        sock.ev.removeAllListeners()
      } catch (e) {}

      if (shouldReconnect) {
        setTimeout(() => {
          if (sessions.get(userId)?.sock === sock || sessions.get(userId)?.status === 'disconnected') {
            createSession(userId)
          }
        }, 5000)
      } else {
        sessions.delete(userId)
        const fs = require('fs')
        if (fs.existsSync(authPath)) {
          console.log(`[${userId}] Logged out. Deleting credentials directory: ${authPath}`)
          try {
            fs.rmSync(authPath, { recursive: true, force: true })
          } catch (err) {
            console.error(`[${userId}] Error deleting credentials directory:`, err)
          }
        }
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  // Tangani sinkronisasi riwayat pesan (history sync) saat pertama kali terhubung
  sock.ev.on('messaging-history.set', async ({ chats, messages, contacts, isLatest }) => {
    console.log(`[${userId}] History sync: menerima ${messages?.length || 0} pesan. Memulai proses sinkronisasi...`)
    if (!messages || messages.length === 0) return

    const formatted = []
    for (const msg of messages) {
      if (!msg.message) continue

      const text = msg.message?.conversation 
        || msg.message?.extendedTextMessage?.text 
        || ''

      if (!text) continue

      const remoteJid = msg.key.remoteJid
      if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) continue

      const sender = remoteJid.replace('@s.whatsapp.net', '')
      const fromMe = !!msg.key.fromMe
      const senderName = msg.pushName || (fromMe ? 'You' : sender)

      formatted.push({
        userId,
        sender,
        message: text,
        name: senderName,
        timestamp: msg.messageTimestamp,
        messageId: msg.key.id,
        fromMe,
      })
    }

    if (formatted.length === 0) return

    console.log(`[${userId}] Mengirim ${formatted.length} pesan riwayat dalam format massal ke webhook...`)
    
    // Kirim dalam ukuran batch 100 untuk menghindari payload terlalu besar
    const chunkSize = 100
    for (let i = 0; i < formatted.length; i += chunkSize) {
      const chunk = formatted.slice(i, i + chunkSize)
      fetch(`${NEXT_APP_URL}/api/webhook/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      })
      .then(res => console.log(`[${userId}] Sinkronisasi batch ${i / chunkSize + 1} terkirim. Status: ${res.status}`))
      .catch(err => console.error(`[${userId}] Gagal mengirim sinkronisasi massal:`, err))
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (!msg.message) continue

      const text = msg.message?.conversation 
        || msg.message?.extendedTextMessage?.text 
        || ''

      if (!text) continue

      // Ambil remoteJid sebagai identitas chat room (baik pesan keluar/masuk)
      const remoteJid = msg.key.remoteJid
      if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) continue

      const sender = remoteJid.replace('@s.whatsapp.net', '')
      const fromMe = !!msg.key.fromMe
      const senderName = msg.pushName || (fromMe ? 'You' : sender)

      fetch(`${NEXT_APP_URL}/api/webhook/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sender,
          message: text,
          name: senderName,
          timestamp: msg.messageTimestamp,
          messageId: msg.key.id,
          fromMe,
        })
      }).catch(err => console.error('[webhook forward error]', err))
    }
  })

  return sessionData
}

async function loadExistingSessions() {
  const fs = require('fs')
  const authDir = path.join(__dirname, 'auth')
  
  if (!fs.existsSync(authDir)) return
  
  const userIds = fs.readdirSync(authDir)
  console.log(`[startup] Loading ${userIds.length} existing sessions...`)
  
  for (const userId of userIds) {
    await createSession(userId)
  }
}

app.post('/session/:userId/connect', async (req, res) => {
  const { userId } = req.params
  
  if (sessions.has(userId)) {
    const existing = sessions.get(userId)
    return res.json({ 
      status: existing.status,
      message: 'Session sudah ada'
    })
  }

  await createSession(userId)
  res.json({ status: 'connecting', message: 'Session dibuat, QR sedang disiapkan' })
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
  
  res.json({ 
    status: session.status,
    connected: session.status === 'connected'
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
    const jid = `${to}@s.whatsapp.net`
    await session.sock.sendMessage(jid, { text: message })
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
