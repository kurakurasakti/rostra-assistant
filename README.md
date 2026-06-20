# Glim — Technical Requirements v2 (MVP)

> Built for Claude Code. Read this entire document before writing any code.
> Updated: api.co.id as WhatsApp BSP, dynamic payment stages, dynamic appointments.

---

## 1. Project Overview

**Rostra** is a WhatsApp-first business assistant for Indonesian micro-brands (fashion, bakery, beauty, photography, catering, etc). It helps business owners:

1. Handle incoming WhatsApp DMs with AI-suggested replies
2. Automate payment reminders and appointment notifications to clients via WhatsApp
3. Import existing client data from Excel/CSV

**Target user:** Indonesian small business owner with 1–3 person team, managing clients via WhatsApp.

**Language:** All UI text in **Bahasa Indonesia**. AI replies drafted in Bahasa Indonesia.

---

## 2. Tech Stack

| Layer        | Technology                              | Notes                       |
| ------------ | --------------------------------------- | --------------------------- |
| Frontend     | Next.js 14 (App Router) + TypeScript    | Use `/app` directory        |
| Styling      | Tailwind CSS + shadcn/ui                | Clean, minimal dashboard UI |
| Database     | Supabase (PostgreSQL)                   | Auth + DB + Realtime        |
| ORM          | Supabase JS client                      | No Prisma for MVP           |
| AI           | OpenRouter API                          | Model: `openai/gpt-4o-mini` |
| WhatsApp     | api.co.id (Official WhatsApp Cloud API) | Rp 100k/month per number    |
| File parsing | xlsx (SheetJS) + papaparse              | Excel and CSV support       |
| Scheduling   | Supabase Edge Functions + pg_cron       | Timed message dispatch      |
| Hosting      | Vercel                                  | Preferred for Next.js       |
| Calendar     | Google Calendar API                     | NOT in MVP scope            |

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

# api.co.id (WhatsApp)
APICOID_TOKEN=
APICOID_BASE_URL=https://api.co.id/v1
WHATSAPP_DEVICE_ID=
WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 4. Folder Structure

```
/app
  /login                    → Login page
  /(dashboard)              → Protected layout with sidebar
    /page.tsx               → Dashboard home
    /clients                → Client list
    /clients/[id]           → Client detail + order management
    /inbox                  → WhatsApp inbox + AI reply
    /import                 → Excel/CSV importer wizard
    /settings               → App settings + WA connection + templates
/components
  /ui                       → shadcn components
  /dashboard                → Sidebar, header, nav
  /clients                  → Client-specific components
  /orders                   → Order form, payment stage builder, appointment builder
  /inbox                    → Message thread, AI draft panel
  /import                   → Upload, mapping, preview, confirm steps
/lib
  /supabase.ts              → Supabase client (browser + server)
  /supabase-server.ts       → Server-side Supabase client
  /openrouter.ts            → AI API wrapper
  /whatsapp.ts              → api.co.id wrapper
  /scheduler.ts             → Scheduled message generation logic
  /importer.ts              → Excel/CSV parse + AI mapping
  /message-templates.ts     → Template interpolation helpers
/app/api
  /webhook/whatsapp/route.ts  → POST — receive incoming WA messages from api.co.id
  /messages/send/route.ts     → POST — send WA message
  /messages/draft/route.ts    → POST — AI draft reply
  /import/preview/route.ts    → POST — parse file + AI column mapping
  /import/confirm/route.ts    → POST — run actual import
  /classify/route.ts          → POST — classify incoming message
  /schedules/generate/route.ts → POST — generate scheduled messages for an order
```

---

## 5. Database Schema (Supabase)

Run these SQL blocks in Supabase SQL editor **in order**.

### 5.1 Profiles

```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  business_name text not null,
  whatsapp_number text,
  brand_voice text default 'Ramah, profesional, sopan, gunakan sapaan Kak',
  apicoid_token text,
  whatsapp_device_id text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can manage own profile"
  on profiles for all
  using (auth.uid() = id);
```

### 5.2 Message Templates

```sql
create type template_type as enum (
  'konfirmasi_pesanan',
  'pengingat_pembayaran',
  'pengingat_janji_temu',
  'custom'
);

create table message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  type template_type not null,
  name text not null,
  body text not null,
  -- Available variables: {{nama_klien}}, {{nama_bisnis}}, {{nama_tahap}},
  --   {{jumlah}}, {{tanggal}}, {{judul_janji}}, {{waktu}}, {{lokasi}},
  --   {{deskripsi_pesanan}}
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table message_templates enable row level security;

create policy "Users manage own templates"
  on message_templates for all
  using (auth.uid() = user_id);
```

### 5.3 Clients

```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  whatsapp_number text not null,  -- format: 628xxxxxxxxxx (no spaces, no +)
  email text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table clients enable row level security;

create policy "Users manage own clients"
  on clients for all
  using (auth.uid() = user_id);

-- Index for fast WA number lookups (webhook matching)
create index idx_clients_whatsapp_number on clients(whatsapp_number, user_id);
```

### 5.4 Orders

```sql
create type order_status as enum ('aktif', 'selesai', 'dibatalkan');

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  client_id uuid references clients(id) on delete cascade,
  description text not null,      -- e.g. "Gaun pengantin custom", "Foto prewedding"
  total_price numeric(12,2) not null,
  status order_status default 'aktif',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table orders enable row level security;

create policy "Users manage own orders"
  on orders for all
  using (auth.uid() = user_id);
```

### 5.5 Payment Stages (DYNAMIC — replaces fixed dp1/dp2/final columns)

```sql
create table payment_stages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references auth.users(id) not null,
  name text not null,             -- free text: "DP 1", "Booking Fee", "Cicilan 2", "Pelunasan"
  amount numeric(12,2) not null,
  due_date date not null,
  paid boolean default false,
  paid_at timestamptz,
  reminder_days_before int default 2,  -- send reminder N days before due_date
  sort_order int not null default 0,   -- display/processing order
  created_at timestamptz default now()
);

alter table payment_stages enable row level security;

create policy "Users manage own payment stages"
  on payment_stages for all
  using (auth.uid() = user_id);

create index idx_payment_stages_order on payment_stages(order_id);
```

### 5.6 Appointments (DYNAMIC — multiple per order, custom titles)

```sql
create table appointments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references auth.users(id) not null,
  client_id uuid references clients(id),
  title text not null,            -- free text: "Fitting 1", "Sesi Foto", "Pengambilan"
  scheduled_at timestamptz not null,
  location text,
  reminder_hours_before int default 24,  -- send reminder N hours before
  reminder_sent boolean default false,
  notes text,
  created_at timestamptz default now()
);

alter table appointments enable row level security;

create policy "Users manage own appointments"
  on appointments for all
  using (auth.uid() = user_id);

create index idx_appointments_order on appointments(order_id);
create index idx_appointments_scheduled on appointments(scheduled_at, user_id);
```

### 5.7 Scheduled Messages

```sql
create type message_status as enum ('menunggu', 'terkirim', 'gagal', 'dibatalkan');
create type scheduled_message_type as enum (
  'konfirmasi_pesanan',
  'pengingat_pembayaran',
  'pengingat_janji_temu',
  'custom'
);

create table scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  order_id uuid references orders(id) on delete cascade,
  client_id uuid references clients(id),
  payment_stage_id uuid references payment_stages(id) on delete cascade,  -- nullable
  appointment_id uuid references appointments(id) on delete cascade,       -- nullable
  message_type scheduled_message_type not null,
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
  on scheduled_messages for all
  using (auth.uid() = user_id);

create index idx_scheduled_messages_due on scheduled_messages(scheduled_at, status);
```

### 5.8 Inbox Messages

```sql
create type inbox_direction as enum ('masuk', 'keluar');
create type inbox_status as enum ('baru', 'dibalas', 'diabaikan', 'dieskalasi');
create type message_classification as enum ('rutin', 'sensitif', 'tidak_diketahui');

create table inbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  client_id uuid references clients(id),   -- null if unknown sender
  direction inbox_direction not null,
  whatsapp_number text not null,
  sender_name text,
  message_body text not null,
  classification message_classification default 'tidak_diketahui',
  ai_draft_reply text,
  status inbox_status default 'baru',
  replied_at timestamptz,
  wa_message_id text,                      -- from api.co.id webhook
  received_at timestamptz default now()
);

alter table inbox_messages enable row level security;

create policy "Users manage own inbox"
  on inbox_messages for all
  using (auth.uid() = user_id);

create index idx_inbox_messages_number on inbox_messages(whatsapp_number, user_id);
create index idx_inbox_messages_status on inbox_messages(status, user_id);
```

### 5.9 Seed Default Message Templates

```sql
-- Run this after creating a user. Replace 'USER_UUID' with actual user id.
-- Or handle this programmatically on first login (recommended).

-- This is the template seed logic to run per user on onboarding:
insert into message_templates (user_id, type, name, body, is_default) values
(
  'USER_UUID',
  'konfirmasi_pesanan',
  'Konfirmasi Pesanan',
  'Halo Kak {{nama_klien}} 👋 Terima kasih sudah memesan di {{nama_bisnis}}! Pesanan Kak untuk *{{deskripsi_pesanan}}* senilai *Rp {{jumlah}}* sudah kami catat. Kami akan segera menginfokan detail selanjutnya ya Kak 🙏',
  true
),
(
  'USER_UUID',
  'pengingat_pembayaran',
  'Pengingat Pembayaran',
  'Halo Kak {{nama_klien}} 😊 Mengingatkan bahwa *{{nama_tahap}}* sebesar *Rp {{jumlah}}* untuk pesanan *{{deskripsi_pesanan}}* jatuh tempo pada *{{tanggal}}*. Mohon segera melakukan pembayaran ya Kak. Terima kasih 🙏',
  true
),
(
  'USER_UUID',
  'pengingat_janji_temu',
  'Pengingat Janji Temu',
  'Halo Kak {{nama_klien}} 👋 Mengingatkan bahwa Kak memiliki *{{judul_janji}}* di {{nama_bisnis}} pada *{{tanggal}}* pukul *{{waktu}} WIB*{{lokasi_text}}. Ditunggu ya Kak! 😊',
  true
);
```

---

## 6. Pages — Detailed Specs

### 6.1 `/login`

**Purpose:** Email + password login via Supabase Auth.

**UI:**

- Rostra logo + tagline: _"Asisten bisnis WhatsApp kamu"_
- Email input
- Password input
- Tombol Login
- Error message inline in Bahasa Indonesia

**Logic:**

- `supabase.auth.signInWithPassword()`
- On success → check `profiles.onboarding_complete` → if false, redirect to `/settings` first
- On error → show error in Bahasa Indonesia

---

### 6.2 `/` — Dashboard

**Purpose:** Morning view. What needs attention today.

**Sections:**

**A. Stats Row**

- Total klien aktif (orders with status = 'aktif', distinct client count)
- Pesanan aktif
- Pesan belum dibalas (inbox where status = 'baru')
- Pengingat terkirim hari ini (scheduled_messages sent today)

**B. Perlu Perhatian Hari Ini**

- Scheduled messages where `scheduled_at::date = today` and `status = 'menunggu'` — list with client name, message type, scheduled time
- Appointments today — title, client name, time
- Overdue payment stages — `due_date < today` and `paid = false` — show client name, stage name, amount, days overdue (highlight in red if > 3 days)
- Each item is clickable → goes to `/clients/[id]`

**C. Pesan Masuk Terbaru**

- Last 5 inbox_messages where `status = 'baru'`
- Show: sender name, preview, classification badge, time
- "Balas" button → goes to `/inbox`

**D. Klien Terbaru**

- Last 5 clients with their latest order status

---

### 6.3 `/clients` — Client List

**UI:**

- Search bar (by name or WA number)
- Tombol "Tambah Klien" (opens slide-over)
- Tombol "Import dari Excel" → goes to `/import`
- Table: Nama | No. WhatsApp | Pesanan Aktif | Status Pembayaran | Ditambahkan

**Add Client form:**

- Nama lengkap (required)
- Nomor WhatsApp (required) — auto-format: strip spaces/dashes/+, add 62 prefix
- Email (optional)
- Catatan (optional)

**Validation:**

- WA number must be valid Indonesian format after normalization
- Duplicate WA number check against existing clients

---

### 6.4 `/clients/[id]` — Client Detail

**Header:** Client name, WA number, "Buka WhatsApp" button (wa.me link), edit button.

**Tabs:**

---

**Tab A: Profil**

- Editable fields: nama, WA number, email, catatan
- Save inline

---

**Tab B: Pesanan**

List of all orders for this client. Each order shows:

- Description, total price, status badge
- Payment progress: e.g. "2 dari 3 tahap lunas" with progress bar
- Expand button to see full order detail

**"Tambah Pesanan" button opens a full-page form or large modal.**

**Order Form — fields:**

```
Deskripsi pesanan *       (text input)
Total harga *             (number, Rp)
Status                    (select: Aktif / Selesai / Dibatalkan)
Catatan                   (textarea)

--- TAHAP PEMBAYARAN ---
[Dynamic list — user can add/remove/reorder stages]

Each stage row:
  Nama tahap *    (text: "DP 1", "Booking Fee", "Cicilan 2", "Pelunasan")
  Jumlah *        (number, Rp)
  Jatuh tempo *   (date picker)
  Ingatkan X hari sebelum  (number input, default: 2)
  [Hapus row button]

[+ Tambah Tahap Pembayaran button]

Validation: sum of all stage amounts should equal total_price.
If mismatch: show warning "Total tahap pembayaran (Rp X) tidak sama dengan harga pesanan (Rp Y)"
But do NOT block save — user may have intentional discrepancy.

--- JANJI TEMU ---
[Dynamic list — user can add/remove]

Each appointment row:
  Judul *         (text: "Fitting 1", "Sesi Foto", "Pengambilan Pesanan")
  Tanggal & waktu * (datetime picker)
  Lokasi          (text, optional)
  Ingatkan X jam sebelum  (number input, default: 24)
  Catatan         (text, optional)
  [Hapus row button]

[+ Tambah Janji Temu button]
```

**When order is saved:**

1. Insert/update `orders` record
2. Delete existing `payment_stages` for this order, re-insert from form data
3. Delete existing `appointments` for this order, re-insert from form data
4. Delete existing `scheduled_messages` with `status = 'menunggu'` for this order
5. Re-generate `scheduled_messages` from fresh payment stages + appointments (see Section 9)
6. Show toast: "Pesanan disimpan. X pesan otomatis dijadwalkan."

**Order Detail expanded view (below the form):**

```
TIMELINE PEMBAYARAN
[Visual vertical timeline]
  ● DP 1 — Rp 500.000 — 10 Jan 2026
    Status: LUNAS ✓ (green) / MENUNGGAK (red) / Jatuh tempo X hari lagi (amber)
    [Tandai Lunas button] if not paid
  ● Fitting Fee — Rp 200.000 — 25 Jan 2026
    Status: Belum lunas
    [Tandai Lunas button]
  ● Pelunasan — Rp 1.300.000 — 15 Feb 2026
    Status: Belum lunas

JADWAL JANJI TEMU
[List]
  📅 Fitting 1 — 12 Jan 2026, 14:00 — Toko Jl. Sudirman No.5
  📅 Fitting 2 — 28 Jan 2026, 15:00

PESAN OTOMATIS TERJADWAL
[Table: Jenis | Pesan preview | Dijadwalkan | Status]
  Konfirmasi pesanan | "Halo Kak..." | 5 mnt lagi | Menunggu
  Pengingat DP 1     | "Halo Kak..." | 8 Jan 2026  | Menunggu
  Pengingat Fitting 1| "Halo Kak..." | 11 Jan 2026 | Menunggu
  [Kirim Sekarang button] per row (sends immediately)
  [Batalkan button] per row (sets status = dibatalkan)
```

**"Tandai Lunas" logic:**

- Set `payment_stages.paid = true`, `paid_at = now()`
- Cancel any pending reminder for that stage (`scheduled_messages.status = 'dibatalkan'`)

---

**Tab C: Riwayat Pesan**

- All inbox_messages for this client (both directions)
- Chronological, most recent first
- Show: direction arrow, message body, time, status

---

### 6.5 `/inbox` — WhatsApp Inbox

**Layout:** Two-column (sidebar + main panel)

**Left sidebar — conversation list:**

- One row per unique WA number
- Shows: name (or number if unknown), last message preview, time, unread count
- Classification badge: `rutin` (blue) / `sensitif` (amber) / `baru` (gray)
- Active conversation highlighted

**Right panel — conversation selected:**

Top section: message thread (all messages this number, chronological)

- Outgoing: right-aligned, blue background
- Incoming: left-aligned, gray background
- Timestamp per message

Bottom section: AI Reply Panel

```
[Textarea — editable, shows AI draft]

[Muat Draft AI]  [Kirim]  [Eskalasi ke Pemilik]

Classification: "AI mendeteksi: pertanyaan harga" (badge)
```

**"Muat Draft AI" logic:**

- POST `/api/messages/draft` with message body + brand voice + last 5 messages as context
- Fill textarea with response
- User can edit before sending

**"Kirim" logic:**

- POST `/api/messages/send`
- Insert outgoing message to `inbox_messages` (direction = 'keluar')
- Update original message `status = 'dibalas'`

**"Eskalasi ke Pemilik" logic:**

- Update `status = 'dieskalasi'` on the message
- Show escalated badge on conversation
- (Push notification: not in MVP scope)

**Realtime:**

- Subscribe to `inbox_messages` via Supabase Realtime
- New incoming messages appear instantly without page refresh
- Unread count badge on `/inbox` nav item updates in real time

---

### 6.6 `/import` — Excel / CSV Importer (4-step wizard)

**Step 1: Upload**

- Drag & drop or click to upload
- Accepted: `.xlsx`, `.xls`, `.csv`
- Max file size: 5MB
- Show file name + row count after upload
- "Lanjut →"

**Step 2: Pemetaan Kolom (AI-assisted)**

Calls `POST /api/import/preview`.

Shows a mapping table:

```
Kolom di file kamu       →   Field Rostra              Contoh data
"Nama Pelanggan"         →   [Nama Klien ▼]            "Siti Rahma"
"No HP"                  →   [No. WhatsApp ▼]          "081234567890"
"Email"                  →   [Email ▼]                 "siti@gmail.com"
"Keterangan"             →   [Catatan ▼]               "Minta warna biru"
"Tanggal Order"          →   [Tidak diimpor ▼]         "2024-01-15"
```

Dropdown options per row: Nama Klien | No. WhatsApp | Email | Catatan | Tidak diimpor

Required: Nama Klien and No. WhatsApp must be mapped before proceeding.

Show: _"AI menemukan {{X}} kolom dari file kamu. Pastikan kolom wajib sudah dipetakan."_

"Lanjut →" (disabled if required fields not mapped)

**Step 3: Preview & Validasi**

Show table of first 10 rows as Rostra will import them.

Row validation rules:

- ❌ Name empty → skip row, show reason
- ❌ WA number invalid after normalization → skip row, show reason
- ⚠️ WA number already exists in DB → import anyway but show warning "sudah terdaftar"
- ✅ Valid → import

Summary banner:
_"{{X}} klien siap diimpor. {{Y}} baris akan dilewati. {{Z}} duplikat."_

Problematic rows listed separately with reason.

"Impor Sekarang →" / "Batalkan"

**Step 4: Hasil**

- Progress bar during import
- Final summary: _"{{X}} klien berhasil diimpor. {{Y}} dilewati."_
- "Lihat Daftar Klien" button

---

### 6.7 `/settings` — Settings

**Section A: Profil Bisnis**

- Nama bisnis
- Nomor WhatsApp bisnis (for display, not functional)
- Gaya bahasa / brand voice (textarea with placeholder):
  _"Contoh: Ramah dan profesional. Gunakan sapaan 'Kak'. Jangan terlalu formal."_
- Simpan button

**Section B: Koneksi WhatsApp (api.co.id)**

- API Token input (masked/password type)
- Device ID input
- "Test Koneksi" button → sends test message to own WA number, shows success/fail
- Status indicator: 🟢 Terhubung / 🔴 Tidak Terhubung
- Help text: _"Daftarkan nomor di api.co.id, lalu masukkan token dan device ID di sini."_

**Section C: Template Pesan**

List of all message_templates for this user. For each:

- Template name (editable)
- Template body (editable textarea)
- Variable reference shown below: `{{nama_klien}}` `{{nama_bisnis}}` `{{nama_tahap}}` `{{jumlah}}` `{{tanggal}}` `{{judul_janji}}` `{{waktu}}` `{{lokasi}}`
- Live preview panel: shows rendered template with sample data
- Simpan button per template

User can also add a custom template (type = 'custom').

---

## 7. API Routes

### `POST /api/webhook/whatsapp`

Receives incoming messages from api.co.id webhook.

```typescript
// 1. Verify webhook token (check Authorization header matches WEBHOOK_SECRET)
// 2. Parse api.co.id payload (see Section 10 for format)
// 3. Find client by whatsapp_number + user_id (if match exists)
// 4. Insert into inbox_messages (direction = 'masuk', status = 'baru')
// 5. Fire background task: classify + generate AI draft
// 6. Return 200 immediately — never block the webhook response
```

### `POST /api/messages/send`

```typescript
body: {
  to: string; // 628xxx format
  message: string;
  user_id: string;
}
// Calls api.co.id send message endpoint
// Inserts outgoing message to inbox_messages (direction = 'keluar')
```

### `POST /api/messages/draft`

```typescript
body: {
  message_id: string
  message_body: string
  sender_name?: string
  brand_voice: string
  conversation_history?: Array<{ role: 'user' | 'assistant', content: string }>
}
// Returns: { draft: string, classification: 'rutin' | 'sensitif', reason: string }
// Also updates inbox_messages: set ai_draft_reply and classification
```

### `POST /api/classify`

```typescript
body: {
  message: string;
}
// Returns: { classification: 'rutin' | 'sensitif', reason: string }
```

### `POST /api/import/preview`

```typescript
// Accepts: multipart/form-data with file field
// Returns:
{
  headers: string[]
  sample_rows: string[][]         // first 5 rows
  ai_mapping: {
    column_name: string
    suggested_field: 'nama_klien' | 'whatsapp_number' | 'email' | 'catatan' | 'tidak_diimpor'
    confidence: 'tinggi' | 'sedang' | 'rendah'
  }[]
  total_rows: number
}
```

### `POST /api/import/confirm`

```typescript
body: {
  rows: Array<{
    name: string;
    whatsapp_number: string;
    email?: string;
    notes?: string;
  }>;
}
// Normalizes WA numbers
// Validates each row
// Bulk inserts valid rows to clients table
// Returns: { imported: number, skipped: number, errors: Array<{row, reason}> }
```

### `POST /api/schedules/generate`

```typescript
body: {
  order_id: string;
}
// Fetches order + all payment_stages + all appointments + client + profile
// Generates scheduled_messages records:
//   - 1 order confirmation (scheduled_at = now + 5 minutes)
//   - 1 reminder per payment_stage (scheduled_at = due_date - reminder_days_before at 09:00 WIB)
//   - 1 reminder per appointment (scheduled_at = scheduled_at - reminder_hours_before)
// Inserts all records, returns count
```

---

## 8. Schedule Generation Logic

In `/lib/scheduler.ts`:

```typescript
import { format, subDays, subHours } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const WIB = "Asia/Jakarta";

export function generateOrderConfirmation(
  order,
  client,
  profile,
  template,
): ScheduledMessage {
  return {
    order_id: order.id,
    client_id: client.id,
    message_type: "konfirmasi_pesanan",
    whatsapp_number: client.whatsapp_number,
    message_body: interpolateTemplate(template.body, {
      nama_klien: client.name,
      nama_bisnis: profile.business_name,
      deskripsi_pesanan: order.description,
      jumlah: formatRupiah(order.total_price),
    }),
    scheduled_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    status: "menunggu",
  };
}

export function generatePaymentReminder(
  stage: PaymentStage,
  order: Order,
  client: Client,
  profile: Profile,
  template: MessageTemplate,
): ScheduledMessage {
  // Calculate reminder time: due_date - reminder_days_before, at 09:00 WIB
  const dueDate = new Date(stage.due_date);
  const reminderDate = subDays(dueDate, stage.reminder_days_before);
  const scheduledAt = toZonedTime(
    new Date(reminderDate.setHours(9, 0, 0, 0)),
    WIB,
  );

  return {
    order_id: order.id,
    client_id: client.id,
    payment_stage_id: stage.id,
    message_type: "pengingat_pembayaran",
    whatsapp_number: client.whatsapp_number,
    message_body: interpolateTemplate(template.body, {
      nama_klien: client.name,
      nama_bisnis: profile.business_name,
      nama_tahap: stage.name,
      jumlah: formatRupiah(stage.amount),
      tanggal: format(dueDate, "dd MMMM yyyy", { locale: id }),
      deskripsi_pesanan: order.description,
    }),
    scheduled_at: scheduledAt,
    status: "menunggu",
  };
}

export function generateAppointmentReminder(
  appointment: Appointment,
  order: Order,
  client: Client,
  profile: Profile,
  template: MessageTemplate,
): ScheduledMessage {
  const scheduledAt = subHours(
    new Date(appointment.scheduled_at),
    appointment.reminder_hours_before,
  );
  const lokasi_text = appointment.location ? ` di ${appointment.location}` : "";

  return {
    order_id: order.id,
    client_id: client.id,
    appointment_id: appointment.id,
    message_type: "pengingat_janji_temu",
    whatsapp_number: client.whatsapp_number,
    message_body: interpolateTemplate(template.body, {
      nama_klien: client.name,
      nama_bisnis: profile.business_name,
      judul_janji: appointment.title,
      tanggal: format(new Date(appointment.scheduled_at), "dd MMMM yyyy", {
        locale: id,
      }),
      waktu: format(new Date(appointment.scheduled_at), "HH:mm", {
        locale: id,
      }),
      lokasi_text,
    }),
    scheduled_at: scheduledAt,
    status: "menunggu",
  };
}

// Template interpolation
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => variables[key] ?? `{{${key}}}`,
  );
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}
```

---

## 9. AI Integration (OpenRouter)

**Base setup in `/lib/openrouter.ts`:**

```typescript
const MODEL = "openai/gpt-4o-mini";

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 500,
): Promise<string> {
  const res = await fetch(
    `${process.env.OPENROUTER_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL!,
        "X-Title": "Rostra",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    },
  );
  const data = await res.json();
  return data.choices[0].message.content;
}
```

**System prompts:**

```typescript
// CLASSIFY — returns JSON only
export const CLASSIFY_SYSTEM = `
Kamu adalah asisten yang mengklasifikasikan pesan WhatsApp untuk bisnis kecil di Indonesia.
Klasifikasikan pesan sebagai:
- "rutin": tanya harga, tanya stok/ketersediaan, konfirmasi, tanya status pesanan, ucapan, pertanyaan umum
- "sensitif": negosiasi harga, komplain, minta refund, tanya keterlambatan, permintaan khusus yang perlu keputusan pemilik

Balas HANYA dengan JSON valid. Tidak ada teks lain.
Format: {"classification": "rutin" atau "sensitif", "reason": "alasan singkat bahasa Indonesia"}
`;

// DRAFT REPLY
export const getDraftSystem = (brandVoice: string) => `
Kamu adalah admin WhatsApp profesional untuk bisnis di Indonesia.
Gaya bicara bisnis ini: ${brandVoice}
Tulis balasan WhatsApp yang singkat, natural, dan sesuai konteks percakapan.
Gunakan Bahasa Indonesia yang sesuai karakter bisnis.
Maksimal 3-4 kalimat. Jangan terlalu panjang. Jangan gunakan bahasa terlalu formal.
Jangan memulai dengan "Halo" jika percakapan sudah berjalan.
`;

// COLUMN MAPPING — returns JSON only
export const COLUMN_MAPPING_SYSTEM = `
Kamu membantu memetakan kolom spreadsheet ke field sistem Rostra.
Field yang tersedia:
- "nama_klien" — nama lengkap klien
- "whatsapp_number" — nomor WhatsApp (format Indonesia: 08xx atau 62xx atau +62xx)
- "email" — alamat email
- "catatan" — catatan tambahan tentang klien
- "tidak_diimpor" — kolom ini tidak perlu diimpor

Balas HANYA dengan JSON valid array. Tidak ada teks lain.
Format: [{"column": "nama kolom asli", "field": "field_rostra", "confidence": "tinggi|sedang|rendah"}]
`;
```

---

## 10. WhatsApp Integration (api.co.id)

**Base setup in `/lib/whatsapp.ts`:**

```typescript
const BASE_URL = process.env.APICOID_BASE_URL!; // https://api.co.id/v1
const TOKEN = process.env.APICOID_TOKEN!;
const DEVICE_ID = process.env.WHATSAPP_DEVICE_ID!;

export async function sendTextMessage(
  to: string,
  message: string,
): Promise<{
  success: boolean;
  message_id?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/send-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: DEVICE_ID,
        to, // 628xxx format
        message,
        type: "text",
      }),
    });
    const data = await res.json();
    return {
      success: data.status === "success",
      message_id: data.message_id,
      error: data.message,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// api.co.id webhook payload structure
export interface ApiCoIdWebhookPayload {
  device_id: string;
  from: string; // sender WA number (628xxx format)
  message: string; // message text
  message_id: string;
  sender_name: string;
  timestamp: number;
  type: "text" | "image" | "document" | "audio";
}

// Verify webhook authenticity
export function verifyWebhook(token: string): boolean {
  return token === process.env.WEBHOOK_SECRET;
}
```

**Webhook setup in api.co.id dashboard:**

- Set webhook URL to: `https://your-domain.vercel.app/api/webhook/whatsapp`
- Set webhook token (matches `WEBHOOK_SECRET`)
- Enable: incoming messages, message status

---

## 11. Scheduler — Supabase Edge Function

**Edge Function: `send-scheduled-messages`**

```typescript
// supabase/functions/send-scheduled-messages/index.ts

import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get all messages due now (with 1 minute buffer)
  const { data: messages } = await supabase
    .from("scheduled_messages")
    .select(
      `
      *,
      profiles!inner(apicoid_token, whatsapp_device_id, business_name)
    `,
    )
    .eq("status", "menunggu")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50); // process max 50 per run to avoid timeout

  if (!messages || messages.length === 0) {
    return new Response("No messages due", { status: 200 });
  }

  for (const msg of messages) {
    try {
      const res = await fetch(`${Deno.env.get("APP_URL")}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: msg.whatsapp_number,
          message: msg.message_body,
          apicoid_token: msg.profiles.apicoid_token,
          device_id: msg.profiles.whatsapp_device_id,
        }),
      });

      if (res.ok) {
        await supabase
          .from("scheduled_messages")
          .update({ status: "terkirim", sent_at: new Date().toISOString() })
          .eq("id", msg.id);
      } else {
        throw new Error(await res.text());
      }
    } catch (err) {
      await supabase
        .from("scheduled_messages")
        .update({ status: "gagal", error_message: String(err) })
        .eq("id", msg.id);
    }
  }

  return new Response(`Processed ${messages.length} messages`, { status: 200 });
});
```

**pg_cron setup (run in Supabase SQL editor):**

```sql
-- Enable pg_cron extension first in Supabase Dashboard → Extensions
select cron.schedule(
  'send-scheduled-messages',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-scheduled-messages',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )
  $$
);
```

---

## 12. Excel Importer Logic

In `/lib/importer.ts`:

```typescript
import * as XLSX from "xlsx";
import Papa from "papaparse";

export async function parseFile(file: File): Promise<{
  headers: string[];
  rows: string[][];
}> {
  const buffer = await file.arrayBuffer();

  if (file.name.endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer);
    const result = Papa.parse(text, { header: false, skipEmptyLines: true });
    const data = result.data as string[][];
    return { headers: data[0], rows: data.slice(1) };
  } else {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
    });
    return {
      headers: data[0] as string[],
      rows: (data.slice(1) as string[][]).filter((r) =>
        r.some((c) => c !== ""),
      ),
    };
  }
}

export function normalizeWANumber(input: string): string | null {
  if (!input) return null;
  let num = String(input).replace(/[\s\-\+\(\)\.]/g, "");
  if (num.startsWith("0")) num = "62" + num.slice(1);
  else if (num.startsWith("8")) num = "62" + num;
  else if (num.startsWith("+62")) num = num.slice(1);
  // Validate: starts with 62, 10-15 digits total
  if (!/^62[0-9]{8,13}$/.test(num)) return null;
  return num;
}

export function validateImportRow(row: {
  name?: string;
  whatsapp_number?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!row.name?.trim()) errors.push("Nama kosong");
  if (!normalizeWANumber(row.whatsapp_number || "")) {
    errors.push("Nomor WhatsApp tidak valid");
  }
  return { valid: errors.length === 0, errors };
}
```

---

## 13. Build Order for Claude Code

Follow this exact sequence. Do NOT skip or reorder steps.

```
Step 1:  Supabase — create all tables from Section 5 via SQL editor
Step 2:  Next.js init — npx create-next-app@latest rostra --typescript --tailwind --app
Step 3:  Install shadcn/ui — npx shadcn@latest init + add components: button, input,
         label, card, badge, dialog, sheet, tabs, toast, table, select, textarea, progress
Step 4:  Install deps — npm install @supabase/supabase-js @supabase/ssr xlsx papaparse
         date-fns date-fns-tz
Step 5:  Supabase client setup — /lib/supabase.ts (browser) + /lib/supabase-server.ts
Step 6:  Middleware — protect all routes except /login using Supabase session
Step 7:  Login page + auth logic
Step 8:  Dashboard layout — sidebar with nav links, header, protected route wrapper
Step 9:  Settings page — Sections A (profile) + B (WA connection) only
Step 10: Clients list page + add client slide-over form
Step 11: Client detail page — Tab A (profile edit)
Step 12: Order form — dynamic payment stages builder (add/remove/reorder rows)
Step 13: Order form — dynamic appointments builder (add/remove rows)
Step 14: Order save logic — insert order + payment_stages + appointments + generate schedules
Step 15: Order detail expanded view — payment timeline + appointments list + scheduled messages
Step 16: "Tandai Lunas" button logic
Step 17: WhatsApp lib — /lib/whatsapp.ts with sendTextMessage()
Step 18: POST /api/webhook/whatsapp — receive + store + auto-classify in background
Step 19: Inbox page — conversation list + message thread
Step 20: POST /api/messages/draft — AI draft generation
Step 21: Inbox — send reply + escalate buttons
Step 22: Dashboard — stats row + attention items + recent messages
Step 23: Import wizard — Step 1 (upload) + Step 2 (AI mapping)
Step 24: Import wizard — Step 3 (validation preview) + Step 4 (confirm + result)
Step 25: Settings — Section C (message template editor with live preview)
Step 26: Supabase Edge Function — send-scheduled-messages
Step 27: pg_cron job setup
Step 28: "Kirim Sekarang" button on scheduled messages (manual send)
```

---

## 14. MVP Scope Boundaries

**IN scope:**

- Everything in this document

**OUT of scope — do not build:**

- Landing / marketing page
- Google Calendar sync
- User registration (accounts created manually)
- Multi-user / team members
- Analytics charts
- Mobile app
- Payment gateway (QRIS, Midtrans, etc.)
- Instagram DM integration
- WhatsApp unofficial API (Baileys, Fonnte)

---

## 15. Key Rules for Claude Code

- **Money:** All amounts stored as `numeric(12,2)`. Display with `Rp` prefix and `.` thousand separator: _Rp 1.500.000_
- **Dates:** Store UTC in DB. Display in WIB (UTC+7) using `date-fns-tz`
- **WA Numbers:** Always stored as `628xxxxxxxxxx` — no `+`, no spaces. Normalize on input
- **RLS:** Every table has Row Level Security enabled. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- **Auth:** Every API route must verify the user session via `supabase-server.ts` before touching data
- **Language:** All UI text, labels, buttons, error messages, toasts in Bahasa Indonesia
- **Toasts:** Use shadcn/ui `toast` for all feedback — success, error, info
- **Dynamic lists (payment stages + appointments):** Use `react` state with array of objects. Each item has a temp `uuid` for React key. On save, send full array to backend — backend deletes old records and re-inserts
- **Template interpolation:** All `{{variable}}` replacement happens server-side in `/lib/message-templates.ts` before storing in `scheduled_messages.message_body`. Never store raw templates in scheduled_messages
- **Mobile responsive:** Nice-to-have, not required for MVP

```

```
