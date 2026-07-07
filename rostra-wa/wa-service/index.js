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
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const pino = require("pino");

const app = express();
app.use(express.json());

const sessions = new Map();
// Pending on-demand fetchMessageHistory() requests, keyed by peerDataRequestSessionId
const pendingHistoryRequests = new Map();
// In-memory media cache: key = `${userId}:${messageId}`, value = { buffer, mimeType, createdAt }
const mediaCache = new Map();

// Evict media older than 1 hour every 30 min
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, entry] of mediaCache.entries()) {
    if (entry.createdAt < cutoff) mediaCache.delete(key);
  }
}, 30 * 60 * 1000);

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

class ContactStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.contacts = {};
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, "utf8");
        this.contacts = JSON.parse(data || "{}");
        console.log(`[ContactStore] Loaded ${Object.keys(this.contacts).length} contacts`);
      }
    } catch (err) {
      console.error("[ContactStore] failed to load:", err);
    }
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.contacts, null, 2), "utf8");
    } catch (err) {
      console.error("[ContactStore] failed to save:", err);
    }
  }

  update(list) {
    if (!Array.isArray(list)) return;
    let changed = false;
    for (const item of list) {
      const jid = item.id || item.lid || item.phoneNumber;
      if (!jid) continue;

      const displayName = item.name || item.notify || null;
      if (!displayName) continue;

      if (!this.contacts[jid] || this.contacts[jid].name !== displayName) {
        this.contacts[jid] = {
          jid,
          name: displayName,
          notify: item.notify || null
        };
        changed = true;
      }
    }
    if (changed) {
      this.save();
    }
  }
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

function extractMedia(m) {
  if (!m) return null;
  if (m.imageMessage) return { type: "image", mimeType: m.imageMessage.mimetype || "image/jpeg" };
  if (m.stickerMessage) return { type: "image", mimeType: m.stickerMessage.mimetype || "image/webp" };
  if (m.videoMessage) return { type: "video", mimeType: m.videoMessage.mimetype || "video/mp4" };
  if (m.audioMessage) return { type: "audio", mimeType: m.audioMessage.mimetype || "audio/ogg" };
  if (m.documentMessage) return { type: "document", mimeType: m.documentMessage.mimetype || "application/octet-stream" };
  if (m.viewOnceMessage?.message?.imageMessage) return { type: "image", mimeType: m.viewOnceMessage.message.imageMessage.mimetype || "image/jpeg" };
  if (m.viewOnceMessage?.message?.videoMessage) return { type: "video", mimeType: m.viewOnceMessage.message.videoMessage.mimetype || "video/mp4" };
  return null;
}

async function forwardHistoryBatch(userId, batch, attempt = 0) {
  if (batch.length === 0) return;
  console.log(`[${userId}] history: forwarding ${batch.length} messages (attempt ${attempt + 1})`);
  try {
    const res = await fetch(`${NEXT_APP_URL}/api/webhook/whatsapp/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify({ userId, messages: batch }),
    });
    console.log(`[${userId}] history forward response: ${res.status}`);
    if (!res.ok && attempt < 2) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      return forwardHistoryBatch(userId, batch, attempt + 1);
    }
  } catch (err) {
    console.error(`[${userId}] history forward error:`, err);
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      return forwardHistoryBatch(userId, batch, attempt + 1);
    }
  }
}

async function forwardContacts(userId, contacts, attempt = 0) {
  if (!contacts || contacts.length === 0) return;
  const payload = {
    userId,
    contacts: contacts.map(c => ({
      jid: c.id || c.lid || c.phoneNumber || null,
      name: c.name || c.notify || null
    })).filter(c => c.jid && c.name)
  };

  if (payload.contacts.length === 0) return;

  try {
    const res = await fetch(`${NEXT_APP_URL}/api/webhook/whatsapp/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[${userId}] contacts forward failed with status:`, res.status);
    } else {
      console.log(`[${userId}] successfully forwarded ${payload.contacts.length} contacts`);
    }
  } catch (err) {
    console.error(`[${userId}] contacts forward error:`, err);
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      return forwardContacts(userId, contacts, attempt + 1);
    }
  }
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

  // Create auth directory if not exists
  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }

  const storePath = path.join(authPath, "contacts_store.json");
  const store = new ContactStore(storePath);
  store.load();

  const sessionData = {
    sock,
    qr: null,
    status: "connecting",
    userId,
    cachedHistory: [],
    contactNames: new Map(), // jid/lid/phoneNumber → display name
    lidToPn: new Map(),      // lid@lid → pn@s.whatsapp.net
    store,
  };
  const resolveContactName = (jid, pushName) => {
    if (!jid) return null;

    // 1. Try store contacts first (persisted and reactive)
    const contact = store.contacts[jid];
    if (contact) {
      const displayName = contact.name || contact.notify || null;
      if (displayName) {
        console.log(`[wa-service/resolveContactName] found ${jid} in store contacts: "${displayName}"`);
        return displayName;
      }
    }

    // 2. Try in-memory contactNames map
    if (sessionData.contactNames.has(jid)) {
      const name = sessionData.contactNames.get(jid);
      console.log(`[wa-service/resolveContactName] found ${jid} in contactNames: "${name}"`);
      return name;
    }

    // For @lid JIDs: cross-reference via lidToPn
    if (jid.endsWith("@lid")) {
      const pnJid = sessionData.lidToPn.get(jid);
      if (pnJid) {
        const pnContact = store.contacts[pnJid];
        if (pnContact) {
          const displayName = pnContact.name || pnContact.notify || null;
          if (displayName) {
            console.log(`[wa-service/resolveContactName] found LID ${jid} via PN ${pnJid} in store: "${displayName}"`);
            return displayName;
          }
        }
        if (sessionData.contactNames.has(pnJid)) {
          const name = sessionData.contactNames.get(pnJid);
          console.log(`[wa-service/resolveContactName] found LID ${jid} via PN ${pnJid} in contactNames: "${name}"`);
          return name;
        }
      }
    }

    // 3. Fall back to pushName
    if (pushName) {
      console.log(`[wa-service/resolveContactName] fallback to pushName for ${jid}: "${pushName}"`);
      return pushName;
    }
    console.log(`[wa-service/resolveContactName] no name found for ${jid}`);
    return null;
  };
  sessionData.resolveContactName = resolveContactName;

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

      // Forward persisted contacts from store immediately on connection open
      const persistedContacts = Object.values(store.contacts);
      if (persistedContacts.length > 0) {
        console.log(`[${userId}] forwarding ${persistedContacts.length} persisted contacts from store on connect`);
        forwardContacts(userId, persistedContacts).catch((err) =>
          console.error(`[${userId}] failed to forward persisted contacts:`, err)
        );
      }

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

  // Keep LID → PN map fresh for real-time message name resolution
  sock.ev.on("lid-mapping.update", (mapping) => {
    if (mapping?.lid && mapping?.pn) {
      sessionData.lidToPn.set(`${mapping.lid}@lid`, `${mapping.pn}@s.whatsapp.net`);
      console.log(`[${userId}] lid-mapping.update: ${mapping.lid}@lid → ${mapping.pn}@s.whatsapp.net`);
    }
  });

  sock.ev.on("contacts.upsert", (contacts) => {
    store.update(contacts);
    let named = 0;
    for (const contact of contacts) {
      const displayName = contact.name || contact.notify || null;
      if (!displayName) continue;
      named++;
      if (contact.id) sessionData.contactNames.set(contact.id, displayName);
      if (contact.lid) sessionData.contactNames.set(contact.lid, displayName);
      if (contact.phoneNumber) sessionData.contactNames.set(contact.phoneNumber, displayName);
    }
    if (named > 0) {
      console.log(`[${userId}] contacts.upsert: updated ${named} contact names`);
      forwardContacts(userId, contacts).catch((err) =>
        console.error(`[${userId}] forwardContacts upsert error:`, err)
      );
    }
  });

  sock.ev.on("contacts.update", (updates) => {
    store.update(updates);
    let named = 0;
    for (const update of updates) {
      const displayName = update.name || update.notify || null;
      if (!displayName) continue;
      named++;
      if (update.id) sessionData.contactNames.set(update.id, displayName);
      if (update.lid) sessionData.contactNames.set(update.lid, displayName);
      if (update.phoneNumber) sessionData.contactNames.set(update.phoneNumber, displayName);
    }
    if (named > 0) {
      console.log(`[${userId}] contacts.update: updated ${named} contact names`);
      forwardContacts(userId, updates).catch((err) =>
        console.error(`[${userId}] forwardContacts update error:`, err)
      );
    }
  });

  sock.ev.on("messaging-history.set", async ({ messages, contacts, lidPnMappings, peerDataRequestSessionId }) => {
    console.log(
      `[${userId}] messaging-history.set count=${messages?.length ?? 0} contacts=${contacts?.length ?? 0} lidMappings=${lidPnMappings?.length ?? 0} peerDataRequestSessionId=${peerDataRequestSessionId ?? "none"}`
    );
    if (!messages || messages.length === 0) return;

    // Case A: On-demand older history fetch response
    if (peerDataRequestSessionId && pendingHistoryRequests.has(peerDataRequestSessionId)) {
      const pending = pendingHistoryRequests.get(peerDataRequestSessionId);
      pendingHistoryRequests.delete(peerDataRequestSessionId);
      clearTimeout(pending.timeout);
      pending.resolve(messages);
      return;
    }

    // Update LID → PN mapping (lid part only, without @suffix)
    // LIDMapping: { pn: "628xxx", lid: "97087..." }
    if (lidPnMappings && lidPnMappings.length > 0) {
      for (const mapping of lidPnMappings) {
        if (mapping.lid && mapping.pn) {
          sessionData.lidToPn.set(`${mapping.lid}@lid`, `${mapping.pn}@s.whatsapp.net`);
        }
      }
      console.log(`[${userId}] lidToPn map updated: ${sessionData.lidToPn.size} entries`);
    }

    // Build contact name map indexed by ALL JID formats for each contact:
    // contact.id (preferred), contact.lid (@lid), contact.phoneNumber (@s.whatsapp.net)
    // contact.name = saved in YOUR phone, contact.notify = contact's own WA profile name
    if (contacts && contacts.length > 0) {
      store.update(contacts);
      let named = 0;
      for (const contact of contacts) {
        const displayName = contact.name || contact.notify || null;
        if (!displayName) continue;
        named++;
        if (contact.id) sessionData.contactNames.set(contact.id, displayName);
        if (contact.lid) sessionData.contactNames.set(contact.lid, displayName);
        if (contact.phoneNumber) sessionData.contactNames.set(contact.phoneNumber, displayName);
      }
      console.log(`[${userId}] contactNames map updated: ${named} named / ${contacts.length} total`);
      forwardContacts(userId, contacts).catch((err) =>
        console.error(`[${userId}] forwardContacts history error:`, err)
      );
    }



    // Case B: Passive sync on connect (group by chat, take latest N messages)
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
      const firstMsg = msgs[0];
      const resolvedName = resolveContactName(jid, firstMsg?.pushName);
      console.log(`[${userId}] history chat: jid=${jid} pushName=${firstMsg?.pushName || 'NONE'} resolved="${resolvedName || 'null'}"`);
      for (const msg of msgs.slice(0, HISTORY_BATCH_LIMIT)) {
        const text = extractText(msg.message);
        if (!text) continue;
        batch.push({
          sender: jid,
          message: text,
          name: resolveContactName(jid, msg.pushName),
          timestamp: toUnixSeconds(msg.messageTimestamp),
          messageId: msg.key.id,
          fromMe: !!msg.key.fromMe,
        });
      }
    }

    sessionData.cachedHistory = batch;
    forwardHistoryBatch(userId, batch).catch((err) =>
      console.error(`[${userId}] history forward unhandled:`, err)
    );
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
      const mediaInfo = extractMedia(msg.message);

      if (!text && !mediaInfo) continue;

      const sender = msg.key.remoteJid ?? "";
      const senderName = resolveContactName(sender, msg.pushName);

      let mediaUrl = null;
      let mediaType = mediaInfo ? mediaInfo.type : null;
      let mediaSize = null;

      if (mediaInfo) {
        try {
          const buffer = await downloadMediaMessage(
            msg,
            "buffer",
            {},
            {
              logger: pino({ level: "silent" }),
              reuploadRequest: sock.updateMediaMessage,
            }
          );
          if (buffer && buffer.length < 10 * 1024 * 1024) {
            const cacheKey = `${userId}:${msg.key.id}`;
            mediaCache.set(cacheKey, {
              buffer,
              mimeType: mediaInfo.mimeType,
              createdAt: Date.now(),
            });
            mediaSize = buffer.length;
            const waPublicUrl =
              process.env.WA_SERVICE_PUBLIC_URL ||
              `http://localhost:${PORT}`;
            mediaUrl = `${waPublicUrl}/session/${userId}/media/${msg.key.id}`;
            console.log(
              `[wa-service] media cached: ${cacheKey} size=${mediaSize} url=${mediaUrl}`
            );
          } else if (buffer) {
            console.log(
              `[wa-service] media too large (${buffer.length} bytes), skipping cache`
            );
          }
        } catch (err) {
          console.error(
            `[wa-service] media download failed:`,
            err?.message || err
          );
        }
      }

      console.log(
        `[wa-service] message from ${sender}: "${text.slice(0, 60)}" mediaType=${mediaType}`
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
          media_url: mediaUrl,
          media_type: mediaType,
          media_size: mediaSize,
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
    try {
      await createSession(userId);
    } catch (err) {
      console.error(`[startup] failed to restore session ${userId}:`, err);
    }
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
  } catch (err) {
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

app.get("/session/:userId/contacts", (req, res) => {
  const session = sessions.get(req.params.userId);
  if (!session) {
    return res.json({ success: false, error: "Session not found" });
  }
  const contacts = Object.values(session.store.contacts);
  res.json({ success: true, contacts });
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
        name: session.resolveContactName(msg.key.remoteJid ?? chatJid, msg.pushName),
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

// Re-forward previously cached history batch — called by Next.js ~10s after connect
// to catch the case where messaging-history.set fired after the connected callback
app.post("/session/:userId/sync-history", (req, res) => {
  const session = sessions.get(req.params.userId);
  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }
  const cached = session.cachedHistory || [];
  console.log(`[${req.params.userId}] sync-history triggered, cached=${cached.length} messages`);
  if (cached.length > 0) {
    forwardHistoryBatch(req.params.userId, cached).catch(() => {});
  }
  res.json({ success: true, count: cached.length });
});

app.get("/session/:userId/media/:messageId", (req, res) => {
  const { userId, messageId } = req.params;
  const entry = mediaCache.get(`${userId}:${messageId}`);
  if (!entry) return res.status(404).json({ error: "not found or expired" });
  res.set("Content-Type", entry.mimeType);
  res.set("Cache-Control", "public, max-age=3600");
  res.send(entry.buffer);
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

// Baileys emits async errors outside request handlers — without these guards a
// single socket error kills every session until someone manually restarts the process
process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[fatal] unhandledRejection:", err);
});

// Listen first so the API is reachable even if session restore is slow or fails
app.listen(PORT, () => {
  console.log(`WA Service running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

loadExistingSessions().catch((err) => {
  console.error("[startup] loadExistingSessions failed:", err);
});
