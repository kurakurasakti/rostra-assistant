# Rostra — Full Technical Requirements (MVP)
> Built for Claude Code. Read this entire document before writing any code.

---

## 1. Project Overview

**Rostra** is a WhatsApp-first business assistant for Indonesian micro-brands (fashion, bakery, beauty, etc). It helps business owners:
1. Handle incoming WhatsApp DMs with AI-suggested replies
2. Automate payment reminders and appointment notifications to clients via WhatsApp
3. Import existing client data from Excel/CSV

**Target user:** Indonesian small business owner with 1–3 person team, managing clients via WhatsApp.

**Language:** All UI text in **Bahasa Indonesia**. AI replies drafted in Bahasa Indonesia.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Use `/app` directory |
| Styling | Tailwind CSS + shadcn/ui | Clean, minimal dashboard UI |
| Database | Supabase (PostgreSQL) | Auth + DB + Realtime |
| ORM | Supabase JS client | No Prisma for MVP |
| AI | OpenRouter API | Model: `openai/gpt-4o-mini` |
| WhatsApp | 360dialog Cloud API | Utility + free-form messages |
| File parsing | xlsx (SheetJS) + papaparse | Excel and CSV support |
| Scheduling | Supabase Edge Functions + pg_cron | Timed message dispatch |
| Hosting | Railway or Vercel | Vercel preferred for Next.js |
| Calendar | Google Calendar API (week 2 only) | Do NOT build this week 1 |

---

## 3. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenRouter
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# 360dialog WhatsApp
DIALOG360_API_KEY=
DIALOG360_PARTNER_ID=
WHATSAPP_PHONE_NUMBER_ID=

# App
NEXT_PUBLIC_APP_URL=
WEBHOOK_SECRET=
```

---

## 4. Folder Structure

```
/app
  /login              → Login page
  /(dashboard)        → Protected layout with sidebar
    /page.tsx         → Dashboard home
    /clients          → Client list
    /clients/[id]     → Client detail + order management
    /inbox            → WhatsApp inbox + AI reply
    /import           → Excel/CSV importer
    /settings         → App settings + WA connection
/components
  /ui                 → shadcn components
  /dashboard          → Sidebar, header, nav
  /clients            → Client-specific components
  /inbox              → Message thread, AI draft panel
  /import             → Upload, mapping, preview, confirm steps
/lib
  /supabase.ts        → Supabase client
  /openrouter.ts      → AI API wrapper
  /whatsapp.ts        → 360dialog API wrapper
  /scheduler.ts       → Scheduled message logic
  /importer.ts        → Excel/CSV parse + AI mapping
/app/api
  /webhook/whatsapp   → POST — receive incoming WA messages
  /messages/send      → POST — send WA message
  /messages/draft     → POST — AI draft reply
  /import/preview     → POST — parse file + AI column mapping
  /import/confirm     → POST — run actual import
  /classify           → POST — classify incoming message
```

---

## 5. Database Schema (Supabase)

Run these in Supabase SQL editor in order.

### 5.1 users (managed by Supabase Auth)
Supabase handles this automatically. Use `auth.users`.

### 5.2 profiles
```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  business_name text not null,
  whatsapp_number text,
  brand_voice text default 'ramah, profesional, sopan',
  dialog360_api_key text,
  phone_number_id text,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can manage own profile"
  on profiles for all using (auth.uid() = id);
```

### 5.3 clients
```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  whatsapp_number text not null,   -- format: 628xxxxxxxxxx
  email text,
  notes text,
  created_at timestamptz default now()
);

alter table clients enable row level security;
create policy "Users manage own clients"
  on clients for all using (auth.uid() = user_id);
```

### 5.4 orders
```sql
create type order_status as enum ('aktif', 'selesai', 'dibatalkan');

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  client_id uuid references clients(id) on delete cascade,
  description text not null,         -- e.g. "Gaun pengantin custom"
  total_price numeric(12,2) not null,
  dp1_amount numeric(12,2),
  dp1_due_date date,
  dp1_paid boolean default false,
  dp2_amount numeric(12,2),
  dp2_due_date date,
  dp2_paid boolean default false,
  final_amount numeric(12,2),
  final_due_date date,
  final_paid boolean default false,
  status order_status default 'aktif',
  notes text,
  created_at timestamptz default now()
);

alter table orders enable row level security;
create policy "Users manage own orders"
  on orders for all using (auth.uid() = user_id);
```

### 5.5 appointments
```sql
create table appointments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references auth.users(id) not null,
  client_id uuid references clients(id),
  title text not null,               -- e.g. "Fitting pertama"
  scheduled_at timestamptz not null,
  location text,
  reminder_sent boolean default false,
  notes text,
  created_at timestamptz default now()
);

alter table appointments enable row level security;
create policy "Users manage own appointments"
  on appointments for all using (auth.uid() = user_id);
```

### 5.6 scheduled_messages
```sql
create type message_status as enum ('menunggu', 'terkirim', 'gagal', 'dibatalkan');
create type message_type as enum ('dp1', 'dp2', 'final', 'appointment', 'konfirmasi', 'custom');

create table scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  order_id uuid references orders(id) on delete cascade,
  client_id uuid references clients(id),
  message_type message_type not null,
  whatsapp_number text not null,
  message_body text not null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status message_status default 'menunggu',
  error_message text,
  created_at timestamptz default now()
);

alter table scheduled_messages enable row level security;
create policy "Users manage own scheduled messages"
  on scheduled_messages for all using (auth.uid() = user_id);
```

### 5.7 inbox_messages
```sql
create type inbox_direction as enum ('masuk', 'keluar');
create type inbox_status as enum ('baru', 'dibalas', 'diabaikan', 'dieskalasi');
create type message_classification as enum ('rutin', 'sensitif', 'tidak_diketahui');

create table inbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  client_id uuid references clients(id),   -- nullable if unknown sender
  direction inbox_direction not null,
  whatsapp_number text not null,
  sender_name text,
  message_body text not null,
  classification message_classification default 'tidak_diketahui',
  ai_draft_reply text,
  status inbox_status default 'baru',
  replied_at timestamptz,
  wa_message_id text,                       -- from 360dialog webhook
  received_at timestamptz default now()
);

alter table inbox_messages enable row level security;
create policy "Users manage own inbox"
  on inbox_messages for all using (auth.uid() = user_id);
```

---

## 6. Pages — Detailed Specs

### 6.1 `/login` — Login Page

**Purpose:** Email + password login via Supabase Auth.

**UI Elements:**
- Rostra logo + tagline: *"Asisten bisnis WhatsApp kamu"*
- Email input
- Password input
- Login button
- No registration — admin creates accounts manually for now (MVP)

**Logic:**
- Call `supabase.auth.signInWithPassword()`
- On success → redirect to `/`
- On error → show inline error message in Bahasa Indonesia

---

### 6.2 `/` — Dashboard

**Purpose:** Morning overview. What needs attention today.

**Sections:**

**A. Stats row (top)**
- Total klien aktif
- Pesanan aktif
- Pesan belum dibalas (inbox)
- Pengingat terkirim hari ini

**B. Perlu perhatian hari ini**
- List of scheduled_messages where `scheduled_at` is today and `status = menunggu`
- List of appointments today
- List of orders where DP is overdue (due_date < today, paid = false)
- Each item is clickable → goes to relevant order

**C. Pesan masuk terbaru**
- Last 5 inbox messages where `status = baru`
- Show: sender name, message preview, classification badge (rutin/sensitif)
- Quick button: "Balas" → goes to `/inbox`

**D. Klien terbaru**
- Last 5 added clients with their order status

---

### 6.3 `/clients` — Client List

**Purpose:** View and manage all clients.

**UI:**
- Search bar (filter by name or WA number)
- Add client button (opens slide-over form)
- Import button → goes to `/import`
- Table columns: Nama, No. WhatsApp, Total Pesanan, Status Pesanan Terbaru, Dibuat

**Add client form fields:**
- Nama lengkap (required)
- Nomor WhatsApp (required, format hint: 628xxx)
- Email (optional)
- Catatan (optional)

**Logic:**
- On add → insert to `clients` table
- Auto-format WA number: strip leading 0, add 62 prefix
- Validate WA number format before saving

---

### 6.4 `/clients/[id]` — Client Detail

**Purpose:** The core of Rostra. Everything about one client and their order.

**Tabs:**

**Tab A: Profil**
- Client info (name, WA, email, notes)
- Edit inline
- Button: "Buka WhatsApp" → wa.me link

**Tab B: Pesanan**
- List of all orders for this client
- Each order shows: description, total, status badge, payment progress bar
- Button: "Tambah Pesanan"

**Add/Edit Order form:**
```
Deskripsi pesanan  (text)
Total harga        (number, Rp)
--- Jadwal Pembayaran ---
DP 1: jumlah + tanggal jatuh tempo
DP 2: jumlah + tanggal jatuh tempo (optional)
Pelunasan: jumlah + tanggal jatuh tempo
--- Janji Temu ---
[list of appointments with + button]
  Title, tanggal & waktu, lokasi (optional)
Catatan pesanan (textarea)
```

**Order detail expanded view:**
- Payment timeline (visual): shows DP1 → DP2 → Pelunasan with status (lunas/menunggak/upcoming)
- Mark as paid buttons per payment stage
- Appointment list with status
- Scheduled messages timeline: shows all auto-messages queued for this order
- Manual "Kirim Pengingat Sekarang" button per message

**When a new order is saved:**
- Auto-generate `scheduled_messages` records:
  - Order confirmation → scheduled_at = now + 5 minutes
  - DP1 reminder → scheduled_at = dp1_due_date - 2 days at 09:00 WIB
  - DP2 reminder (if exists) → scheduled_at = dp2_due_date - 2 days at 09:00 WIB
  - Final payment reminder → scheduled_at = final_due_date - 2 days at 09:00 WIB
  - Appointment reminder → scheduled_at = appointment date - 1 day at 09:00 WIB
- Use default message templates with client name and amount filled in (see Section 8)

**Tab C: Riwayat Pesan**
- All inbox_messages for this client (both directions)
- Chronological thread view

---

### 6.5 `/inbox` — WhatsApp Inbox

**Purpose:** See all incoming WA messages. Get AI draft. Send reply.

**Layout:** Two-column
- Left: message list (like WhatsApp sidebar)
- Right: selected message thread + AI reply panel

**Message list item:**
- Sender name (or WA number if unknown)
- Message preview (truncated)
- Time received
- Classification badge: `rutin` (blue) or `sensitif` (amber) or `baru` (gray)
- Unread dot

**Right panel — message selected:**
- Full message thread (all messages with this number)
- AI draft reply section:
  - Show AI-generated reply in a textarea (editable)
  - Button: "Muat Draft AI" — calls `/api/messages/draft`
  - Button: "Kirim" — sends reply via WA API
  - Button: "Eskalasi ke Pemilik" — marks as `dieskalasi`, sends push notification (skip push notif for MVP, just change status)
- Classification shown with explanation: *"AI mendeteksi pesan ini sebagai: negosiasi harga"*

**Logic:**
- Incoming messages arrive via webhook → stored in `inbox_messages`
- On new message: auto-classify + auto-generate draft (runs in background)
- Realtime updates via Supabase Realtime subscription

---

### 6.6 `/import` — Excel / CSV Importer

**Purpose:** Let users upload their existing client spreadsheet and import into Rostra.

**This is a 4-step wizard:**

**Step 1: Upload**
- Drag & drop or click to upload
- Accepted: `.xlsx`, `.xls`, `.csv`
- Max file size: 5MB
- Button: "Lanjut →"

**Step 2: Mapping Kolom (AI-assisted)**
- Call `POST /api/import/preview` with the file
- Server parses file → extracts headers + first 3 rows
- AI suggests column mapping:
  ```
  Kolom kamu          →  Field Rostra
  "Nama"              →  Nama Klien ✓
  "HP / WA"           →  No. WhatsApp ✓
  "Email"             →  Email ✓
  "Keterangan"        →  Catatan ✓
  "Tgl Order"         →  [Tidak diimpor] 
  ```
- User sees a dropdown per column to correct AI mapping
- Required fields: Nama, No. WhatsApp
- Optional: Email, Catatan
- Show: *"AI menemukan [X] kolom. Pastikan kolom wajib sudah dipetakan dengan benar."*
- Button: "Lanjut →"

**Step 3: Preview & Validasi**
- Show table of first 10 rows as Rostra will import them
- Highlight rows with issues in amber:
  - Missing name
  - Invalid WA number format
  - Duplicate WA number (already exists in DB)
- Summary: *"52 klien siap diimpor. 3 baris memiliki masalah (akan dilewati)."*
- Show problematic rows separately with reason
- User can choose: "Impor semua yang valid" or "Batalkan"
- Button: "Impor Sekarang →"

**Step 4: Hasil Impor**
- Progress bar while importing
- Success summary: *"52 klien berhasil diimpor. 3 dilewati."*
- Button: "Lihat Daftar Klien"

---

### 6.7 `/settings` — Settings

**Sections:**

**A. Profil Bisnis**
- Business name
- Brand voice / tone prompt (textarea): e.g. *"Ramah, profesional, gunakan sapaan 'Kak'"*
- Save button

**B. Koneksi WhatsApp**
- 360dialog API Key input (masked)
- Phone Number ID input
- Test connection button → sends test message to own number
- Status indicator: Connected / Not Connected

**C. Template Pesan**
- Show default message templates for each type
- User can edit each template
- Variables shown: `{{nama_klien}}`, `{{jumlah}}`, `{{tanggal}}`, `{{nama_bisnis}}`
- Template types:
  - Konfirmasi pesanan
  - Pengingat DP 1
  - Pengingat DP 2
  - Pengingat pelunasan
  - Pengingat janji temu
- Save button per template

---

## 7. API Routes

### `POST /api/webhook/whatsapp`
Receives incoming messages from 360dialog.
```typescript
// Verify webhook signature using WEBHOOK_SECRET
// Parse message from 360dialog payload format
// Insert into inbox_messages
// Trigger background: classify + draft reply
// Return 200 OK immediately
```

### `POST /api/messages/send`
Send a WhatsApp message.
```typescript
body: {
  to: string          // 628xxx format
  message: string
  type: 'text' | 'template'
  template_name?: string
  template_params?: string[]
}
```

### `POST /api/messages/draft`
Generate AI reply draft for an inbox message.
```typescript
body: {
  message_id: string
  message_body: string
  sender_name: string
  brand_voice: string
  conversation_history?: Array<{role, content}>
}

// Returns: { draft: string, classification: string }
```

### `POST /api/classify`
Classify an incoming message.
```typescript
body: { message: string }
// Returns: { classification: 'rutin' | 'sensitif', reason: string }
```

### `POST /api/import/preview`
Parse uploaded file + AI column mapping.
```typescript
// Accepts: multipart/form-data with file
// Returns:
{
  headers: string[]
  sample_rows: string[][]
  ai_mapping: {
    column_name: string
    suggested_field: string | null
    confidence: 'tinggi' | 'sedang' | 'rendah'
  }[]
  total_rows: number
}
```

### `POST /api/import/confirm`
Run the actual import.
```typescript
body: {
  file_data: string[][]   // parsed rows from frontend
  mapping: Record<string, string>  // column → field
}
// Returns: { imported: number, skipped: number, errors: string[] }
```

---

## 8. Default Message Templates

Store these as defaults in `profiles` or a separate `message_templates` table.

```
KONFIRMASI PESANAN:
"Halo Kak {{nama_klien}} 👋 Terima kasih sudah memesan di {{nama_bisnis}}! Pesanan Kak untuk {{deskripsi_pesanan}} senilai Rp {{total_harga}} sudah kami catat. Kami akan segera menginfokan detail selanjutnya ya Kak 🙏"

PENGINGAT DP 1:
"Halo Kak {{nama_klien}} 😊 Mengingatkan bahwa DP 1 sebesar Rp {{jumlah}} untuk pesanan {{deskripsi_pesanan}} jatuh tempo pada {{tanggal}}. Mohon segera melakukan pembayaran ya Kak. Terima kasih 🙏"

PENGINGAT DP 2:
"Halo Kak {{nama_klien}} 😊 Mengingatkan bahwa DP 2 sebesar Rp {{jumlah}} untuk pesanan {{deskripsi_pesanan}} jatuh tempo pada {{tanggal}}. Mohon segera melakukan pembayaran ya Kak. Terima kasih 🙏"

PENGINGAT PELUNASAN:
"Halo Kak {{nama_klien}} 😊 Pesanan Kak hampir selesai! Mengingatkan bahwa sisa pembayaran sebesar Rp {{jumlah}} jatuh tempo pada {{tanggal}}. Mohon segera dilunasi ya Kak supaya pesanan bisa segera kami proses 🙏"

PENGINGAT JANJI TEMU:
"Halo Kak {{nama_klien}} 👋 Mengingatkan bahwa Kak memiliki {{judul_janji}} di {{nama_bisnis}} besok, {{tanggal}} pukul {{waktu}}{{lokasi_text}}. Ditunggu ya Kak! 😊"
```

---

## 9. AI Integration (OpenRouter)

**Base setup in `/lib/openrouter.ts`:**
```typescript
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'openai/gpt-4o-mini'

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL,
      'X-Title': 'Rostra'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  })
  const data = await response.json()
  return data.choices[0].message.content
}
```

**System prompts:**

```typescript
// CLASSIFY
const CLASSIFY_PROMPT = `Kamu adalah asisten bisnis yang mengklasifikasikan pesan WhatsApp masuk untuk bisnis kecil di Indonesia.
Klasifikasikan pesan berikut sebagai SALAH SATU dari:
- "rutin": pertanyaan harga, konfirmasi pesanan, menanyakan status, permintaan info umum
- "sensitif": negosiasi harga, komplain, permintaan refund, pertanyaan tentang keterlambatan, pesan yang memerlukan keputusan bisnis

Balas HANYA dengan JSON: {"classification": "rutin"|"sensitif", "reason": "alasan singkat dalam bahasa Indonesia"}`

// DRAFT REPLY  
const DRAFT_PROMPT = (brandVoice: string) => 
`Kamu adalah asisten admin untuk bisnis fashion di Indonesia.
Gaya bicara bisnis ini: ${brandVoice}
Tulis balasan WhatsApp yang singkat, ramah, dan sesuai konteks.
Gunakan bahasa Indonesia yang natural dan sesuai gaya bisnis.
Maksimal 3 kalimat. Jangan berlebihan.`

// COLUMN MAPPING
const MAPPING_PROMPT = `Kamu membantu memetakan kolom spreadsheet ke field database Rostra.
Field yang tersedia: nama_klien, whatsapp_number, email, catatan, [tidak_diimpor]
Balas HANYA dengan JSON array: [{"column": "nama kolom asli", "field": "nama field rostra atau tidak_diimpor", "confidence": "tinggi|sedang|rendah"}]`
```

---

## 10. WhatsApp Integration (360dialog)

**Base setup in `/lib/whatsapp.ts`:**
```typescript
const BASE_URL = 'https://waba.360dialog.io/v1'

async function sendTextMessage(to: string, message: string): Promise<void> {
  await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'D360-API-KEY': process.env.DIALOG360_API_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: message }
    })
  })
}

async function sendTemplateMessage(
  to: string,
  templateName: string,
  params: string[]
): Promise<void> {
  // Template messages for utility category (payment reminders, appointment reminders)
  // These are pre-approved WhatsApp templates
}
```

**Webhook payload handler:**
360dialog sends messages to `POST /api/webhook/whatsapp`. Parse this structure:
```typescript
// 360dialog webhook payload
{
  messages: [{
    from: string,        // sender WA number
    id: string,          // message ID
    timestamp: string,
    type: 'text',
    text: { body: string }
  }],
  contacts: [{
    profile: { name: string },
    wa_id: string
  }]
}
```

---

## 11. Scheduler Logic

Use Supabase Edge Functions + pg_cron to run every 5 minutes:

```sql
-- Enable pg_cron in Supabase dashboard
-- Add this cron job:
select cron.schedule(
  'send-scheduled-messages',
  '*/5 * * * *',   -- every 5 minutes
  $$
  select net.http_post(
    url := current_setting('app.edge_function_url') || '/send-scheduled',
    headers := '{"Authorization": "Bearer " || current_setting("app.service_role_key")}'::jsonb
  )
  $$
);
```

The Edge Function `send-scheduled`:
1. Query `scheduled_messages` where `status = 'menunggu'` AND `scheduled_at <= now()`
2. For each message: call 360dialog API to send
3. Update `status = 'terkirim'` and `sent_at = now()` on success
4. Update `status = 'gagal'` and `error_message` on failure

---

## 12. Excel Importer Logic

In `/lib/importer.ts`:

```typescript
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export function parseFile(file: File): Promise<{
  headers: string[]
  rows: string[][]
}> {
  // Handle .xlsx/.xls with XLSX library
  // Handle .csv with Papa.parse
  // Always return string[][] for uniform processing
}

export function validateRow(row: Record<string, string>): {
  valid: boolean
  errors: string[]
} {
  // Check: name not empty
  // Check: WA number format (must start with 62, 10-15 digits)
  // Check: no duplicate within upload batch
}

export function normalizeWANumber(input: string): string {
  // Remove spaces, dashes, +
  // If starts with 0: replace with 62
  // If starts with 8: prepend 62
  // If starts with +62: remove +
  // Validate final format
}
```

---

## 13. Build Order for Claude Code

Follow this exact sequence. Do not skip steps.

```
Step 1:  Supabase setup — create all tables from Section 5
Step 2:  Next.js project init with Tailwind + shadcn/ui
Step 3:  Login page + Supabase Auth
Step 4:  Protected layout with sidebar navigation
Step 5:  Settings page — brand voice + WA connection form
Step 6:  Clients list page + add client form
Step 7:  Client detail page — Tab A (profile) + Tab B (orders)
Step 8:  Order form — payments + appointments + auto-schedule generation
Step 9:  Scheduled messages display on order detail
Step 10: /api/webhook/whatsapp — receive + store incoming messages
Step 11: Inbox page — message list + thread view
Step 12: /api/messages/draft — AI reply generation
Step 13: Inbox — send reply button
Step 14: Dashboard — stats + today's attention items
Step 15: Excel importer — Step 1 (upload) + Step 2 (mapping)
Step 16: Excel importer — Step 3 (preview/validation) + Step 4 (confirm import)
Step 17: Scheduler Edge Function
Step 18: Message template editor in Settings
```

---

## 14. MVP Scope Boundaries

**IN scope (build now):**
- Everything in this document

**OUT of scope (do not build):**
- Landing/marketing page
- Google Calendar sync
- User registration (admin creates accounts)
- Multi-user / team features
- Analytics / reporting charts
- Mobile app
- Payment gateway integration
- Instagram DM integration
- Two-way WhatsApp Business App sync (Baileys)

---

## 15. Notes for Claude Code

- All money values stored as `numeric(12,2)` — display with `Rp` prefix and `.` thousand separator (Indonesian format)
- All dates stored as UTC in DB — display in WIB (UTC+7)
- WhatsApp numbers always stored in `628xxxxxxxxxx` format — never with `+` or spaces
- Use Supabase Row Level Security on every table — never expose service role key to frontend
- All API routes must check `auth.uid()` from Supabase session before doing anything
- The app is in Bahasa Indonesia — all labels, buttons, error messages, success toasts in Bahasa Indonesia
- Use `shadcn/ui` toast for all success/error feedback
- Mobile responsive is nice-to-have, not required for MVP
