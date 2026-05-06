# Rostra — Build Phases

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation

**Goal:** Login, register (invite-only), layout kosong, session persist setelah refresh.

- [x] Scaffold Next.js 15 + TypeScript + Tailwind via `pnpm create next-app`
- [x] Init shadcn/ui + install semua komponen
- [x] Install deps: `@supabase/supabase-js @supabase/ssr xlsx papaparse date-fns date-fns-tz`
- [x] Buat folder structure lengkap
- [x] Buat `/types/index.ts` — semua shared TypeScript types
- [x] Buat `/lib/supabase/client.ts` — browser Supabase client
- [x] Buat `/lib/supabase/server.ts` — server Supabase client (cookies)
- [x] Buat `proxy.ts` — auth protection + redirect (Next.js 16: middleware → proxy)
- [x] Buat `app/login/page.tsx` — login form
- [x] Buat `app/(dashboard)/layout.tsx` — sidebar + header layout
- [x] Buat `app/(dashboard)/page.tsx` — dashboard placeholder
- [x] Setup `.env.local.example` template
- [x] Tambah `INVITE_CODE=` ke `.env.local` dan `.env.local.example`
- [x] Buat `app/register/page.tsx` — form: Nama Bisnis + Email + Password + Kode Undangan
- [x] Validasi invite code di register: bandingkan input dengan `process.env.INVITE_CODE`
      Jika salah → tampilkan error "Kode undangan tidak valid" — jangan reveal kode yang benar
      Jika benar → lanjut `supabase.auth.signUp({ email, password, options: { data: { business_name } } })`
- [x] Update `proxy.ts` — whitelist `/register` di samping `/login` dan `/api/webhook`
- [x] Login page — tambah link: "Belum punya akun? Hubungi kami untuk mendapat kode undangan"
      (jangan link langsung ke /register — biarkan URL /register hanya diketahui beta user)
- [x] Onboarding redirect logic — setelah login DAN setelah register:
      cek `profiles.onboarding_complete`
      jika false → redirect ke `/settings`
      jika true → redirect ke `/`
- [x] Settings page — jika `onboarding_complete = false`, tampilkan banner:
      "Lengkapi koneksi WhatsApp kamu untuk mulai menggunakan Rostra"
      Setelah Fonnte token + device number disimpan → set `onboarding_complete = true`

**Done when:** Bisa register dengan kode undangan, login, lihat layout kosong,
session persist setelah refresh, redirect ke /settings jika belum onboarding.

---

## Phase 1 — Client, Order Management & WhatsApp Setup

**Goal:**
Hubungkan WA via QR scan → AI pelajari gaya chat → tambah klien → buat
pesanan → lihat timeline → tandai lunas.

---

### 1A. WhatsApp Connection (Fonnte Multi-Device)

> Roy punya 1 akun Fonnte master. Setiap customer cukup scan QR di
> dashboard Rostra — tidak perlu tahu Fonnte sama sekali.

**Env yang dibutuhkan (di .env):**

```
FONNTE_MASTER_TOKEN=   ← account token Roy di Fonnte, bukan device token
```

**Schema update — tambah ke `profiles`:**

```sql
alter table profiles
  add column fonnte_device_id   text unique,  -- device ID dari Fonnte
  add column fonnte_device_token text,         -- device token (untuk send msg)
  add column wa_connected       boolean not null default false;
```

**Checklist:**

- [x] Tambah `FONNTE_MASTER_TOKEN` ke `.env` dan `.env.local.example`
- [ ] Jalankan SQL alter table profiles di atas di Supabase
- [x] `POST /api/whatsapp/connect`
- [x] `GET /api/whatsapp/status`
- [x] Settings page — Section B: "Hubungkan WhatsApp" (QR flow + polling + Putuskan Koneksi)

---

### 1B. AI Brand Voice — Analisa Gaya Chat

> User upload export chat WhatsApp mereka. AI pelajari cara bicara admin
> bisnis, lalu gunakan gaya yang sama untuk draft balasan.

**Format file export WhatsApp (.txt):**

```
[10/01/24, 09.15.22] Admin Toko: Halo Kak, selamat pagi! 😊
[10/01/24, 09.16.05] Pelanggan: mau tanya harga kak
[10/01/24, 09.16.30] Admin Toko: Tentu Kak! Untuk gaun custom...
```

**Lib baru — `/lib/chat-parser.ts`:**

```typescript
export interface ParsedMessage {
  timestamp: string;
  sender: string;
  content: string;
}

export interface ChatAnalysis {
  senders: string[]; // semua nama pengirim unik di file
  messagesBySender: Record<string, string[]>; // pesan per sender
  totalMessages: number;
}

export function parseWhatsAppExport(text: string): ChatAnalysis {
  // Regex untuk format: [DD/MM/YY, HH.MM.SS] Sender: Message
  // Handle multi-line messages (pesan panjang yang wrap)
  // Filter: system messages ("Messages and calls are end-to-end encrypted", dll)
  // Return: daftar sender unik + pesan per sender
}

export function extractBusinessMessages(
  analysis: ChatAnalysis,
  selectedSender: string,
): string[] {
  // Ambil HANYA pesan dari sender yang dipilih user
  // Filter pesan terlalu pendek (< 5 kata) — tidak berguna untuk analisa
  // Max 150 pesan terakhir untuk context AI
  return analysis.messagesBySender[selectedSender] ?? [];
}
```

**AI Prompt untuk brand voice analysis:**

```typescript
// Di /lib/openrouter.ts — tambah fungsi ini:

export async function analyzeBrandVoice(
  messages: string[], // pesan dari sisi bisnis
): Promise<string> {
  const sample = messages.slice(-100).join("\n"); // 100 pesan terakhir

  const system = `
Kamu adalah analis gaya komunikasi bisnis Indonesia.
Tugasmu: analisa pesan WhatsApp dari admin sebuah bisnis kecil, 
lalu buat deskripsi gaya komunikasi yang SPESIFIK dan ACTIONABLE.

Output harus berupa paragraf singkat (3-5 kalimat) yang mendeskripsikan:
1. Sapaan yang biasa digunakan (Kak, Kak [nama], dll)
2. Emoji yang sering dipakai
3. Panjang pesan (singkat/panjang)
4. Frasa atau kata khas yang sering muncul
5. Cara merespons pertanyaan harga / ketersediaan
6. Tingkat formalitas

JANGAN gunakan bullet points. Tulis dalam bentuk paragraf natural.
Output langsung digunakan sebagai system prompt untuk AI reply — 
jadi tulis seolah kamu menginstruksikan AI untuk meniru gaya ini.
`;

  const user = `
Berikut contoh pesan WhatsApp dari admin bisnis ini:

${sample}

Analisa dan deskripsikan gaya komunikasi mereka.
`;

  return callAI(system, user, 300);
}
```

**Contoh output AI:**

```
Selalu membuka dengan "Halo Kak [nama] 😊" jika tahu nama pelanggan,
atau "Halo Kak" jika tidak. Gunakan emoji 😊 dan 🙏 di hampir setiap
pesan, terutama di akhir kalimat. Pesan singkat, 1-3 kalimat per respons.
Frasa khas: "siap Kak!", "noted ya Kak 🙏", "ditunggu ya Kak!".
Untuk pertanyaan harga, selalu jawab dengan "mulai dari Rp X ya Kak,
tergantung model dan bahan". Tidak formal — hindari kata seperti "saya"
atau "kami", cukup langsung saja.
```

**Checklist:**

- [x] Buat `/lib/chat-parser.ts` — parser format .txt WhatsApp export
- [x] `POST /api/settings/analyze-chat`
- [x] `POST /api/settings/analyze-voice`
- [x] Settings page — Section A: tambah sub-section "Gaya Komunikasi AI"

      **UI flow:**
      ```
      [Textarea brand_voice — bisa edit manual]

      ─── atau ───

      Tombol "Analisa dari Chat WhatsApp"
            ↓ klik
      Upload .txt file (drag & drop)
            ↓ upload
      "Ditemukan X pengirim di file ini. Pilih nama admin bisnis kamu:"
      [Radio buttons: "Admin Toko" / "Siti" / "Rahma" / ...]
            ↓ pilih + klik "Analisa"
      Loading state: "AI sedang mempelajari gaya chat kamu..."
            ↓ selesai
      Preview hasil analisa (read-only)
      "AI akan membalas seperti ini: [contoh draft reply]"
            ↓
      Tombol "Gunakan Gaya Ini" / "Analisa Ulang" / "Edit Manual"
            ↓ konfirmasi
      Simpan ke profiles.brand_voice
      Toast: "Gaya komunikasi berhasil diperbarui ✓"
      ```

- [ ] Tambah sample preview di bawah textarea brand_voice:
      Input pesan test: "kak mau tanya harga baju seragam 50 pcs"
      Tombol "Coba Draft AI" → call `/api/messages/draft` dengan brand_voice
      Tampilkan contoh draft reply yang akan dihasilkan

---

### 1C. Client Management

- [x] `/lib/whatsapp.ts` — `sendTextMessage`, `normalizeWANumber`, `getDeviceStatus`
- [x] Clients list page — `/clients`
- [x] Add Client form (slide-over) + validasi + duplicate check
- [x] Client detail page — `/clients/[id]` — Tab 1: Profil, Tab 2: Pesanan, Tab 3: placeholder

---

### 1D. Order Management

- [x] `/lib/templates.ts` — `interpolateTemplate`, `formatRupiah`, `formatRupiahInput`
- [x] `/lib/scheduler.ts` — `generateScheduledMessages` (konfirmasi + payment + appointment reminders)
- [x] Order form modal (di `/clients/[id]`) — info + payment stages + appointments
- [x] `POST /api/schedules/generate`
- [x] Order save logic (upsert + delete/re-insert stages & appointments + regenerate schedules)
- [x] Order detail expanded view — payment timeline + appointments + scheduled messages table
- [x] "Tandai Lunas", "Kirim Sekarang", "Batalkan" buttons

---

**Done when:**

- Customer scan QR → WA terhubung
- Upload chat export → AI pelajari gaya → brand voice tersimpan
- Tambah klien → buat pesanan → stages + appointments → timeline tampil
- Tandai lunas → reminder otomatis dibatalkan
- Kirim pesan manual dari dashboard berhasil

---

## Phase 2 — WhatsApp Inbox

**Goal:** Webhook terima pesan → muncul di inbox → AI draft → kirim balasan → status update realtime.

- [x] `/lib/openrouter.ts` — `classifyMessage()`, `draftReply()` dengan brand_voice + history
- [x] `POST /api/webhook/whatsapp` — multi-tenant routing + auto-link ke clients
- [x] `POST /api/messages/send` — kirim via Fonnte + save outgoing message
- [x] `POST /api/messages/draft` — updated dengan auto brand_voice fetch + conversation context
- [x] `POST /api/classify` — AI message classification (rutin/sensitif/tidak_diketahui)
- [x] Inbox page — conversation list + message thread + realtime + draft panel
- [x] Realtime subscription di inbox — Supabase channels + live updates
- [x] AI draft panel — Muat Draft AI + Kirim + Eskalasi (dieskalasi/diabaikan)

**DB Migration:** `inbox_messages` ditambah ke `supabase_realtime` publication.

**Prerequisites:** SUPABASE_SERVICE_ROLE_KEY in .env.local + Fonnte webhook URL configured.

**Done when:** Webhook terima pesan → muncul di inbox → AI draft → kirim balasan → status update realtime. ✓

---

## Phase 3 — Automation Scheduler

**Goal:** Pesan reminder terkirim otomatis tanpa intervensi manual.

- [ ] Buat Supabase Edge Function `send-scheduled-messages`
- [ ] Deploy Edge Function ke Supabase
- [ ] Setup pg_cron (tiap 5 menit)
- [ ] Test end-to-end: buat pesanan → cek scheduled_messages → tunggu 5 menit → cek terkirim

**Done when:** Pesan reminder terkirim otomatis tanpa intervensi manual.

---

## Phase 4 — Excel Importer

**Goal:** Upload Excel 50+ baris → AI mapping kolom → preview → import berhasil.

- [ ] `/lib/importer.ts` — parseFile + validateRow
- [ ] `POST /api/import/preview` — parse file + AI column mapping
- [ ] `POST /api/import/confirm` — validasi + bulk insert
- [ ] Import wizard UI Step 1 & 2 — upload + AI column mapping (`/import`)
- [ ] Import wizard UI Step 3 & 4 — preview validasi + hasil

**Done when:** Upload Excel dengan 50+ baris → AI mapping kolom → preview → import berhasil.

---

## Phase 5 — Dashboard & Polish

**Goal:** MVP complete. Semua flow berjalan. Deployed dan webhook live.

- [ ] Dashboard — stats row (4 kartu)
- [ ] Dashboard — Perlu Perhatian Hari Ini
- [ ] Dashboard — Pesan Masuk Terbaru + Klien Terbaru
- [ ] Settings — Section C: template editor + live preview
- [ ] Client detail — Tab 3: riwayat pesan
- [ ] End-to-end smoke test semua flow
- [ ] Deploy ke Vercel
- [ ] Setup Fonnte webhook URL ke production URL

**Done when:** MVP complete. Semua flow berjalan. Deployed dan webhook live.

---

## Database Setup (manual — lakukan sebelum Phase 0 selesai)

Jalankan SQL ini di Supabase SQL Editor **secara berurutan** (lihat README.md Section 5):

- [ ] 5.1 Enum types
- [ ] 5.2 `profiles` table + RLS
- [ ] 5.3 Auto-create profile trigger
- [ ] 5.4 `message_templates` table + RLS
- [ ] 5.5 Auto-seed default templates trigger
- [ ] 5.6 `clients` table + RLS + indexes
- [ ] 5.7 `orders` table + RLS + indexes
- [ ] 5.8 `payment_stages` table + RLS + indexes
- [ ] 5.9 `appointments` table + RLS + indexes
- [ ] 5.10 `scheduled_messages` table + RLS + index
- [ ] 5.11 `inbox_messages` table + RLS + indexes
