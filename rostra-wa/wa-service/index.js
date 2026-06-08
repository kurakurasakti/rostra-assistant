// Load .env file manually — works on all Node versions
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key && !(key in process.env)) process.env[key] = val;
    });
}

const express = require("express");
const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeInMemoryStore,
} = require("@whiskeysockets/baileys");
const pino = require("pino");

const app = express();
app.use(express.json());

const sessions = new Map();
// Pending on-demand fetchMessageHistory() requests, keyed by peerDataRequestSessionId
const pendingHistoryRequests = new Map();

const NEXT_APP_URL = process.env.NEXT_APP_URL || "http://localhost:3000";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const PORT = process.env.PORT || 3001;
const HISTORY_BATCH_LIMIT = 10;

// messageTimestamp can be a plain number or a protobuf Long — normalize to a JSON-safe number
function toUnixSeconds(ts) {
  if (ts == null) return null;
  if (typeof ts === "number") return ts;
  if (typeof ts === "object" && typeof ts.toNumber === "function") return ts.toNumber();
  return Number(ts);
}

function extractText(m) {
  if (!m) return "";
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    m?.ephemeralMessage?.message?.conversation ||
    m?.ephemeralMessage?.message?.extendedTextMessage?.text ||
    m?.viewOnceMessage?.message?.imageMessage?.caption ||
    m?.viewOnceMessage?.message?.videoMessage?.caption ||
    m?.buttonsResponseMessage?.selectedDisplayText ||
    m?.listResponseMessage?.title ||
    m?.templateButtonReplyMessage?.selectedDisplayText ||
    ""
  );
}

function forwardHistoryBatch(userId, batch) {
  if (batch.length === 0) return;
  console.log(`[${userId}] history: forwarding ${batch.length} messages`);
  fetch(`${NEXT_APP_URL}/api/webhook/whatsapp/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": WEBHOOK_SECRET,
    },
    body: JSON.stringify({ userId, messages: batch }),
  })
    .then((res) =>
      console.log(`[${userId}] history forward response: ${res.status}`)
    )
    .catch((err) =>
      console.error(`[${userId}] history forward error:`, err)
    );
}

async function createSession(userId) {
  const authPath = path.join(__dirname, "auth", userId);

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: ["Rostra", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
  });

  const sessionData = {
    sock,
    qr: null,
    status: "connecting",
    userId,
  };
  sessions.set(userId, sessionData);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sessionData.qr = qr;
      sessionData.status = "waiting_scan";
      console.log(`[${userId}] QR ready`);
    }

    if (connection === "open") {
      sessionData.status = "connected";
      sessionData.qr = null;
      const jid = sock.user?.id ?? "";
      const number = jid ? jid.split(":")[0].split("@")[0] : null;
      console.log(`[${userId}] Connected as ${number ?? "unknown"}`);

      fetch(`${NEXT_APP_URL}/api/whatsapp/connected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, number: number ?? "" }),
      })
        .then((r) =>
          console.log(`[${userId}] /connected callback: ${r.status}`)
        )
        .catch((err) =>
          console.error(`[${userId}] /connected callback error:`, err)
        );
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errMessage = lastDisconnect?.error?.message;
      const reasonName = Object.keys(DisconnectReason).find(
        (k) => DisconnectReason[k] === statusCode
      );
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      sessionData.status = "disconnected";
      console.log(
        `[${userId}] Disconnected. statusCode=${statusCode} reason=${reasonName ?? "unknown"} message="${errMessage}" Reconnect: ${shouldReconnect}`
      );

      // Tear down the old socket fully before spinning up a new one — a stale socket left
      // alive alongside a fresh one causes a concurrent-connection conflict, which WhatsApp
      // resolves by killing one side with statusCode=401 "Intentional Logout"
      sock.ev.removeAllListeners();
      try {
        sock.end(undefined);
      } catch {}

      // Notify Next.js so wa_connected resets to false in DB
      fetch(`${NEXT_APP_URL}/api/whatsapp/disconnected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, willReconnect: shouldReconnect }),
      }).catch(() => {});

      if (shouldReconnect) {
        setTimeout(() => createSession(userId), 3000);
      } else {
        sessions.delete(userId);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messaging-history.set", async ({ messages, peerDataRequestSessionId }) => {
    console.log(
      `[${userId}] messaging-history.set count=${messages?.length ?? 0} peerDataRequestSessionId=${peerDataRequestSessionId ?? "none"}`
    );
    if (!messages || messages.length === 0) return;

    // On-demand fetchMessageHistory() response — hand raw messages to the waiting requester
    if (peerDataRequestSessionId && pendingHistoryRequests.has(peerDataRequestSessionId)) {
      const pending = pendingHistoryRequests.get(peerDataRequestSessionId);
      pendingHistoryRequests.delete(peerDataRequestSessionId);
      clearTimeout(pending.timeout);
      pending.resolve(messages);
      return;
    }

    // Passive sync on connect — group by chat, keep newest N per chat, forward as backfill batch
    const byChat = new Map();
    for (const msg of messages) {
      if (!msg.message) continue;
      const jid = msg.key.remoteJid;
      if (!jid) continue;
      if (!byChat.has(jid)) byChat.set(jid, []);
      byChat.get(jid).push(msg);
    }

    const batch = [];
    for (const [jid, msgs] of byChat) {
      msgs.sort((a, b) => Number(b.messageTimestamp ?? 0) - Number(a.messageTimestamp ?? 0));
      for (const msg of msgs.slice(0, HISTORY_BATCH_LIMIT)) {
        const text = extractText(msg.message);
        if (!text) continue;
        batch.push({
          sender: jid,
          message: text,
          name: msg.pushName || jid,
          timestamp: toUnixSeconds(msg.messageTimestamp),
          messageId: msg.key.id,
          fromMe: !!msg.key.fromMe,
        });
      }
    }

    forwardHistoryBatch(userId, batch);
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    console.log(
      `[${userId}] messages.upsert type=${type} count=${messages.length}`
    );
    if (type !== "notify") return;

    for (const msg of messages) {
      console.log(
        `[${userId}] msg fromMe=${msg.key.fromMe} remoteJid=${
          msg.key.remoteJid
        } hasMessage=${!!msg.message}`
      );
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const text = extractText(msg.message);

      if (!text) continue;

      const sender = msg.key.remoteJid ?? "";
      const senderName = msg.pushName || sender;

      console.log(
        `[wa-service] message from ${sender}: "${text.slice(0, 60)}"`
      );
      console.log(
        `[wa-service] forwarding to ${NEXT_APP_URL}/api/webhook/whatsapp`
      );

      fetch(`${NEXT_APP_URL}/api/webhook/whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          userId,
          sender,
          message: text,
          name: senderName,
          timestamp: msg.messageTimestamp,
          messageId: msg.key.id,
        }),
      })
        .then((res) =>
          console.log(`[wa-service] webhook response: ${res.status}`)
        )
        .catch((err) =>
          console.error("[wa-service] webhook forward error:", err)
        );
    }
  });

  return sessionData;
}

async function loadExistingSessions() {
  const authDir = path.join(__dirname, "auth");

  if (!fs.existsSync(authDir)) return;

  const userIds = fs
    .readdirSync(authDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  console.log(`[startup] Loading ${userIds.length} existing sessions...`);

  for (const userId of userIds) {
    await createSession(userId);
  }
}

app.post("/session/:userId/connect", async (req, res) => {
  const { userId } = req.params;
  const QRCode = require("qrcode");

  let sessionData;
  const authPath = path.join(__dirname, "auth", userId);

  if (sessions.has(userId)) {
    sessionData = sessions.get(userId);
    if (sessionData.status === "connected") {
      return res.json({ status: "connected" });
    }
    if (sessionData.qr) {
      const qr = await QRCode.toDataURL(sessionData.qr);
      return res.json({ status: "waiting_scan", qr });
    }
    // Session in memory but disconnected/stuck — remove it and start fresh
    sessions.delete(userId);
  }

  // Delete stale auth so Baileys generates a new QR instead of trying to resume logged-out session
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true });
    console.log(`[${userId}] Cleared stale auth, starting fresh session`);
  }

  sessionData = await createSession(userId);

  // Wait up to 30s for QR or connected (network can be slow on fetchLatestBaileysVersion)
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (sessionData.qr || sessionData.status === "connected") {
        clearInterval(check);
        resolve();
      }
    }, 500);
    setTimeout(() => {
      clearInterval(check);
      resolve();
    }, 30000);
  });

  if (sessionData.status === "connected") {
    return res.json({ status: "connected" });
  }

  if (!sessionData.qr) {
    return res.status(504).json({ error: "QR timeout — coba lagi" });
  }

  const qr = await QRCode.toDataURL(sessionData.qr);
  res.json({ status: "waiting_scan", qr });
});

app.get("/session/:userId/qr", async (req, res) => {
  const session = sessions.get(req.params.userId);

  if (!session) {
    return res.json({ status: "not_found" });
  }

  if (session.status === "connected") {
    return res.json({ status: "connected" });
  }

  if (!session.qr) {
    return res.json({
      status: "waiting",
      message: "QR belum siap, coba lagi 2 detik",
    });
  }

  try {
    const QRCode = require("qrcode");
    const qrBase64 = await QRCode.toDataURL(session.qr);
    res.json({ status: "waiting_scan", qr: qrBase64 });
  } catch {
    res.json({ status: "waiting_scan", qr: session.qr });
  }
});

app.get("/session/:userId/status", (req, res) => {
  const session = sessions.get(req.params.userId);

  if (!session) {
    return res.json({ status: "not_found", connected: false });
  }

  const jid = session.sock?.user?.id ?? "";
  const number = jid ? jid.split(":")[0].split("@")[0] : undefined;

  res.json({
    status: session.status,
    connected: session.status === "connected",
    number: number || undefined,
  });
});

app.post("/session/:userId/send", async (req, res) => {
  const session = sessions.get(req.params.userId);

  if (!session || session.status !== "connected") {
    return res
      .status(400)
      .json({ success: false, error: "Session tidak connected" });
  }

  const { to, message } = req.body;

  if (!to || !message) {
    return res
      .status(400)
      .json({ success: false, error: "to dan message wajib diisi" });
  }

  try {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    const sendOnce = () => session.sock.sendMessage(jid, { text: message });
    try {
      await sendOnce();
    } catch (firstErr) {
      if (String(firstErr).includes("Connection Closed")) {
        console.log(
          `[${req.params.userId}] Connection Closed on send, retry in 3s...`
        );
        await new Promise((r) => setTimeout(r, 3000));
        await sendOnce();
      } else {
        throw firstErr;
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`[${req.params.userId}] Send error:`, err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post("/session/:userId/disconnect", async (req, res) => {
  const session = sessions.get(req.params.userId);

  if (!session) {
    return res.json({ success: true, message: "Session tidak ditemukan" });
  }

  await session.sock.logout();
  sessions.delete(req.params.userId);
  res.json({ success: true });
});

// On-demand older-history fetch (Tier 2 "load N more" — triggered by inbox scroll-to-top)
app.post("/session/:userId/fetch-history", async (req, res) => {
  const session = sessions.get(req.params.userId);

  if (!session || session.status !== "connected") {
    return res.status(400).json({ success: false, error: "Session tidak connected" });
  }

  const { chatJid, oldestMsgKey, oldestMsgTimestamp, count } = req.body;

  if (!chatJid || !oldestMsgKey || !oldestMsgTimestamp) {
    return res.status(400).json({
      success: false,
      error: "chatJid, oldestMsgKey, dan oldestMsgTimestamp wajib diisi",
    });
  }

  try {
    const { peerDataRequestSessionId } = await session.sock.fetchMessageHistory(
      count || 5,
      oldestMsgKey,
      oldestMsgTimestamp
    );

    const messages = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingHistoryRequests.delete(peerDataRequestSessionId);
        reject(new Error("History fetch timed out"));
      }, 25000);
      pendingHistoryRequests.set(peerDataRequestSessionId, { resolve, timeout });
    });

    const batch = [];
    for (const msg of messages) {
      if (!msg.message) continue;
      const text = extractText(msg.message);
      if (!text) continue;
      batch.push({
        sender: msg.key.remoteJid ?? chatJid,
        message: text,
        name: msg.pushName || msg.key.remoteJid || chatJid,
        timestamp: toUnixSeconds(msg.messageTimestamp),
        messageId: msg.key.id,
        fromMe: !!msg.key.fromMe,
      });
    }

    forwardHistoryBatch(req.params.userId, batch);
    res.json({ success: true, count: batch.length });
  } catch (err) {
    console.error(`[${req.params.userId}] fetch-history error:`, err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    sessions: sessions.size,
    active: [...sessions.entries()].map(([id, s]) => ({
      userId: id,
      status: s.status,
    })),
  });
});

loadExistingSessions().then(() => {
  app.listen(PORT, () => {
    console.log(`WA Service running at http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
});
