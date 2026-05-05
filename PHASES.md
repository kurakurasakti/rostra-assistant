# Rostra — Build Phases

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation
**Goal:** Login, layout kosong, session persist setelah refresh.

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

**Done when:** Bisa login, lihat layout kosong, session persist setelah refresh.

---

## Phase 1 — Client & Order Management
**Goal:** Tambah klien → buat pesanan dengan payment stages + appointments → lihat timeline → tandai lunas.

- [ ] Settings page — profil bisnis + Fonnte token + device number (`/settings`)
- [ ] Clients list page + add client slide-over form (`/clients`)
- [ ] WA number normalization di client form
- [ ] Client detail page — Tab 1: edit profil klien (`/clients/[id]`)
- [ ] `/lib/templates.ts` — interpolation + formatRupiah
- [ ] `/lib/scheduler.ts` — generate scheduled messages logic
- [ ] `/lib/whatsapp.ts` — sendTextMessage + normalizeWANumber
- [ ] Order form — dynamic payment stages builder (add/remove/reorder)
- [ ] Order form — dynamic appointments builder (add/remove)
- [ ] `POST /api/schedules/generate` route
- [ ] Order save logic — upsert order + stages + appointments + generate schedules
- [ ] Order detail expanded — payment timeline + appointments list
- [ ] Scheduled messages table di order detail
- [ ] "Tandai Lunas" button
- [ ] "Kirim Sekarang" button per scheduled message
- [ ] "Batalkan" button per scheduled message

**Done when:** Tambah klien → buat pesanan dengan payment stages + appointments → lihat timeline → tandai lunas.

---

## Phase 2 — WhatsApp Inbox
**Goal:** Webhook terima pesan → muncul di inbox → AI draft → kirim balasan → status update realtime.

- [ ] `/lib/openrouter.ts` — callAI + system prompts
- [ ] `POST /api/webhook/whatsapp` — multi-tenant routing
- [ ] `POST /api/messages/send` route
- [ ] `POST /api/messages/draft` route
- [ ] `POST /api/classify` route
- [ ] Inbox page — conversation list + message thread (`/inbox`)
- [ ] Realtime subscription di inbox (Supabase channels)
- [ ] AI draft panel — Muat Draft AI + Kirim + Eskalasi

**Done when:** Webhook terima pesan → muncul di inbox → AI draft → kirim balasan → status update realtime.

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
