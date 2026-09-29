# SPEC — RAG Correctness + Usage Metering & Quota

> **Untuk:** Antigravity CLI (autonomous coding agent)
> **Repo:** rostra-assistant (Next.js App Router + Supabase + Baileys WA service)
> **Branch:** `feat/rag-correctness-metering` (buat dari `main` terbaru, `git pull origin main` dulu)
> **Tanggal:** 2026-09-29
> **Penulis spec:** hasil review Roy + Hermes

---

## 0. Baca dulu sebelum coding

1. `AGENTS.md` di root repo — Next.js di repo ini punya breaking changes vs training data. Wajib baca guide relevan di `node_modules/next/dist/docs/` sebelum menulis kode Next.js.
2. `PHASES.md` dan `CLAUDE.md` untuk konteks produk.
3. File yang akan diubah — baca penuh, jangan assume:
   - `lib/rag.ts` (359 baris)
   - `app/api/messages/send/route.ts`
   - `app/api/settings/save-business/route.ts`
   - `app/api/webhook/whatsapp/route.ts`
   - `lib/openrouter.ts` (khususnya `draftReply()` ~line 504 dan tipe `AIUsage`)
   - `lib/rate-limit.ts` dan `supabase/migrations/008_ai_usage_and_rate_limits.sql`
   - `supabase/migrations/010_rag_knowledge_chunks.sql`

## 1. Konteks masalah (grounded, sudah diverifikasi ke kode)

1. **Correction loop bocor.** `send/route.ts` mencatat koreksi ke `ai_feedback` + `conversation_examples`, tapi TIDAK pernah memanggil `upsertKnowledgeChunks`. Koreksi owner tidak terlihat oleh RAG sampai owner manual re-save Settings.
2. **Reindex boros & berisiko.** `upsertKnowledgeChunks` (lib/rag.ts:206) melakukan delete-all-then-insert dan re-embed SEMUA chunk setiap save. Jika delete sukses tapi insert gagal → seluruh index RAG user hilang.
3. **Index salah tipe.** Migration 010 memakai `ivfflat (lists=50)`. Corpus per-user hanya belasan–puluhan chunk; ivfflat recall-nya buruk di skala ini.
4. **Ingest failure silent.** `save-business` dan `analyze-voice` fire-and-forget `.catch()` — index gagal terlihat seperti index sukses.
5. **Metering belum cukup untuk billing.** Yang ada: `ai_usage` (harian, requests + est_tokens) via `lib/rate-limit.ts`. Belum ada: monthly quota per plan, tracking embed calls, msgs_in counter, enforcement di webhook. Risiko: user full-auto dengan volume besar = biaya LLM tak terbatas.

## 2. Scope

### IN SCOPE (6 work item, urut pengerjaan)

**WI-A1 — Migration 011: HNSW + content_hash**
File: `supabase/migrations/011_rag_hnsw_content_hash.sql`
- Drop index `knowledge_chunks_embedding_idx` (ivfflat), ganti HNSW:
  `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`
- Tambah kolom `content_hash TEXT` pada `knowledge_chunks` + index `(user_id, content_hash)`.
- Tambah kolom di `profiles`: `last_indexed_at TIMESTAMPTZ`, `rag_dirty_at TIMESTAMPTZ`, `plan TEXT NOT NULL DEFAULT 'free'`.
- Ikuti pola migration existing (IF NOT EXISTS, komentar header, RLS tidak berubah).

**WI-A2 — Diff-by-hash reindex** (`lib/rag.ts`)
- Tulis ulang `upsertKnowledgeChunks` menjadi diff-based:
  1. `chunkProfile()` → compute `sha256(chunk_type + "\n" + chunk_text)` per chunk (pakai `crypto` Node).
  2. Fetch existing `(id, content_hash)` untuk user.
  3. Chunk yang hash-nya sama → skip (tidak re-embed). Hash baru → embed + insert. Hash hilang → delete row-nya saja.
  4. Update `profiles.last_indexed_at = now()`, clear `rag_dirty_at`.
- Return `{ indexed, reused, deleted, skipped }`. Hapus pola delete-all-then-insert.
- Acceptance: save profile tanpa perubahan konten → 0 embedding call (verifikasi via log/counter).

**WI-A3 — Reindex setelah koreksi** (`app/api/messages/send/route.ts`)
- Setelah `updateConversationExamples(...)` berhasil (path koreksi, ~line 184), trigger reindex dengan throttle:
  - Jika `last_indexed_at` < 60 detik lalu → set `profiles.rag_dirty_at = now()` saja.
  - Else → panggil `upsertKnowledgeChunks` (murah karena WI-A2, hanya 1 chunk berubah).
- Catch-up: di route draft generation (`app/api/messages/draft/route.ts` atau tempat `draftReply` dipanggil untuk inbox), jika `rag_dirty_at` tidak null → reindex dulu sebelum retrieve.
- Error reindex TIDAK boleh menggagalkan send. Log + biarkan dirty flag untuk retry.
- Acceptance: koreksi draft → send → chunk `example` baru muncul di `knowledge_chunks` tanpa buka Settings.

**WI-A4 — Surface ingest status**
- `save-business/route.ts`: await (bukan fire-and-forget) `upsertKnowledgeChunks` dengan timeout guard, return `{ indexed, reused, skipped }` di response JSON. Kalau embedding key tidak ada / semua gagal → return warning eksplisit.
- `app/(dashboard)/settings/page.tsx`: tampilkan "Knowledge ter-index: N chunk · terakhir MENIT lalu" (pakai `getChunkCount` + `last_indexed_at`), toast error jika save mengembalikan warning.
- Acceptance: matikan OPENAI/OPENROUTER key → save → UI menampilkan warning, bukan sukses palsu.

**WI-B1 — Migration 012: usage_monthly**
File: `supabase/migrations/012_usage_monthly_quota.sql`
- Tabel `usage_monthly`: `user_id UUID FK`, `month DATE` (first-of-month), `msgs_in INT`, `drafts INT`, `auto_sent INT`, `embed_calls INT`, `llm_tokens_in INT`, `llm_tokens_out INT`, `UNIQUE(user_id, month)`, RLS: user select own; service role full.
- RPC `increment_usage(p_user_id UUID, p_msgs_in INT DEFAULT 0, p_drafts INT DEFAULT 0, p_auto_sent INT DEFAULT 0, p_embed_calls INT DEFAULT 0, p_tokens_in INT DEFAULT 0, p_tokens_out INT DEFAULT 0)` — upsert atomic (month = date_trunc bulan sekarang), SECURITY DEFINER.

**WI-B2 — Instrumentasi + quota enforcement**
- `lib/usage.ts` (baru): helper `trackUsage(userId, {...})` (fire-and-forget RPC call, jangan pernah throw) + `checkQuota(userId)` → `{ allowed, usagePct, plan }`.
- Plan config di `lib/config.ts`:
  ```ts
  export const PLAN_QUOTAS = {
    free: { msgs_in: 300, drafts: 500 },
    pro:  { msgs_in: 3000, drafts: 5000 },
  } as const
  ```
- Instrumentasi (semua fire-and-forget):
  - `webhook/whatsapp/route.ts`: setelah insert `inbox_messages` → `msgs_in: 1`. **SEBELUM pipeline AI, panggil `checkQuota`** → jika habis: simpan pesan apa adanya TANPA draft, set `inbox_messages.status = 'quota_exceeded'`, kirim notifikasi ke owner (sekali per hari, pakai pola `lib/notifications.ts`), jangan gagalkan webhook (WA service tetap 200).
  - Setelah `draftReply` sukses → `drafts: 1, llm_tokens_in/out` dari `usage` yang sudah dikembalikan (`AIUsage`).
  - `lib/rag.ts` `embedText` → `embed_calls: 1` per call sukses (pass userId via param opsional; jangan break signature existing yang dipakai tempat lain — gunakan opsi param kedua).
  - `send/route.ts`: path queue/auto → `auto_sent: 1`.
- Soft warning 80%: notifikasi sekali per bulan per user (flag di `usage_monthly.warned_80 BOOLEAN`).

**WI-B3 — Usage UI**
- `app/(dashboard)/settings/page.tsx` (atau billing jika lebih cocok): progress bar "Penggunaan bulan ini: X / Y pesan (Z%)" + plan name. Data via server component atau route kecil `/api/usage/current`.

### OUT OF SCOPE (jangan dikerjakan, fase berikutnya)
- Hybrid search (tsvector), reranking, threshold tuning
- `conversation_memory` / knowledge_documents+segments (Phase 2)
- Onboarding/teaching via WA, gap detection, weekly digest
- Perubahan apa pun di `rostra-wa/wa-service/`
- Payment integration untuk upgrade plan (cukup flag `plan` manual dulu)

## 3. Aturan main

- **Jangan** ubah signature public yang dipakai banyak tempat tanpa update semua caller; prefer parameter opsional.
- Semua tracking/notifikasi bersifat fire-and-forget: kegagalan metering TIDAK BOLEH mengganggu flow pesan pelanggan.
- Migration harus idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`).
- TypeScript strict — tidak ada `any` baru tanpa alasan. Ikuti Biome config repo.
- Secrets: tidak ada hardcode key; pakai env yang sudah ada.

## 4. Test & verifikasi (wajib sebelum selesai)

1. `pnpm build` (atau script build repo) hijau; `pnpm lint` hijau.
2. Unit test (ikuti pola `src/__tests__/`):
   - diff-by-hash: profile sama → 0 embed; 1 service berubah → 1 embed; service dihapus → row terhapus.
   - throttle WI-A3: dua koreksi berurutan <60s → hanya 1 reindex + dirty flag.
   - `increment_usage` RPC upsert benar (bulan sama → increment, bulan beda → row baru).
   - `checkQuota`: 100% → `allowed: false`; 79% → allowed tanpa warn flag.
3. Jika repo punya pola e2e relevan (`e2e/flows/`), tambah 1 flow kecil: save business → response berisi `indexed`; tidak perlu full WA e2e.
4. SQL migration diuji di Supabase lokal/`supabase db reset` jika tersedia; minimal `EXPLAIN` query `match_knowledge_chunks` memakai index hnsw setelah ada data.
5. Laporkan di akhir: file yang diubah, hasil test, dan hal yang TIDAK selesai (jujur, jangan klaim sukses tanpa output test).

## 5. Definisi selesai (acceptance global)

- [ ] Migration 011 + 012 apply bersih di database kosong maupun existing
- [ ] Koreksi di inbox → knowledge ter-update di RAG tanpa intervensi Settings
- [ ] Save profile tanpa perubahan = 0 embedding call
- [ ] Gagal embed terlihat di UI sebagai warning
- [ ] Quota 100% → pesan tetap tersimpan, AI berhenti diam-diam dengan notifikasi ke owner, webhook tidak error
- [ ] Settings menampilkan usage bulan berjalan
