# Inbox — AI Feedback Loop & Testing Guide

How the inbox correction system trains the AI over time.

---

## Architecture Summary

```
Pelanggan kirim pesan
  → webhook → classifyAndDraft() → ai_draft_reply saved to inbox_messages
  → Admin buka inbox → load draft → edit/hint → kirim
  → sent ≠ original draft → ai_feedback INSERT + feedback_count++
  → feedback_count % 10 === 0 → reanalyzeBrandVoice() (background)
  → brand_voice updated → next draft lebih baik
```

---

## Manual Test Scenario

### Persiapan

1. Pastikan WA terhubung (Settings → WhatsApp → QR scan)
2. Pastikan `brand_voice` sudah diisi (Settings → Brand Voice)
3. Pastikan `product_knowledge` / business knowledge sudah diisi
4. Buka Settings → AI & Eskalasi → catat angka koreksi saat ini

### Skenario 1 — Draft AI kurang tepat, pakai hint

**Langkah:**

1. Kirim pesan WhatsApp ke nomor bisnis:
   ```
   kak mau tanya harga gaun kebaya custom dong
   ```
2. Buka `/inbox` → pilih percakapan → klik **"Muat Draft AI"**
3. Baca draft. Jika kurang tepat (tidak ada harga, terlalu panjang, dll):
4. Ketik petunjuk di hint input:
   ```
   lebih singkat, sebutin harga
   ```
5. Klik **Regenerasi** → baca draft baru
6. Edit manual jika masih kurang (label "Mengedit draft AI" muncul)
7. Klik **Kirim**

**Expected:**
- Toast: `"Pesan terkirim · Koreksi dicatat untuk tingkatkan AI ✓"`
- `ai_feedback` table: 1 row baru (original vs corrected)
- `profiles.feedback_count` naik 1

**Verify di Supabase:**
```sql
select original, corrected, created_at
from ai_feedback
order by created_at desc
limit 5;

select feedback_count from profiles where id = '<your-user-id>';
```

---

### Skenario 2 — Draft AI sudah bagus, tidak perlu edit

**Langkah:**

1. Kirim pesan WA:
   ```
   jam bukanya jam berapa kak?
   ```
2. Buka inbox → load draft AI
3. Draft sudah tepat → klik **Kirim** langsung (tanpa edit)

**Expected:**
- Toast: `"Pesan terkirim"` (tanpa label koreksi)
- Tidak ada baris baru di `ai_feedback`
- `feedback_count` tidak naik

---

### Skenario 3 — Trigger brand voice re-analysis

> Butuh 10 koreksi untuk trigger. Di beta mode butuh 10 koreksi juga —
> tapi `feedback_count` threshold untuk Level 2 lebih rendah (5).

**Langkah:**

1. Ulangi Skenario 1 sampai `feedback_count` mencapai kelipatan 10 (10, 20, 30...)
2. Koreksi ke-10 → `reanalyzeBrandVoice()` fires in background
3. Tunggu ~5 detik
4. Cek `brand_voice` di Supabase:

```sql
select brand_voice, updated_at from profiles where id = '<your-user-id>';
```

**Expected:** `brand_voice` berubah — mencerminkan pola koreksi yang sudah dilakukan.

5. Kirim pesan WA lagi → load draft → bandingkan kualitas vs sebelumnya

---

### Skenario 4 — Unlock Level 2 (beta mode)

> Pastikan `NEXT_PUBLIC_BETA_MODE=true` di `.env.local`

**Langkah:**

1. Lakukan 5 koreksi (Skenario 1 × 5)
2. Buka Settings → AI & Eskalasi
3. Tombol "Aktifkan Level 2" muncul
4. Aktifkan → Level 2 badge tampil

**Level 2 behavior:**
- Pesan rutin → AI draft auto-send dalam 5 menit
- Inbox tampilkan countdown + tombol [Batalkan] [Kirim Sekarang]
- Pesan sensitif tetap masuk inbox untuk review manual

---

### Skenario 5 — Eskalasi

**Langkah:**

1. Kirim pesan WA yang mengandung escalation keyword:
   ```
   kak ini mengecewakan banget sih produknya
   ```
2. Buka inbox → pesan muncul dengan badge **Sensitif**
3. Draft AI = null (tombol "Muat Draft AI" tidak menghasilkan draft)
4. Admin tulis manual → klik **Eskalasi** atau balas manual

**Expected:**
- `status = 'dieskalasi'`
- Notifikasi WA terkirim ke `notification_wa_number` owner

---

## Cara Cek Progress AI Belajar

Setelah beberapa siklus koreksi, bandingkan:

```sql
-- Lihat semua koreksi
select
  substring(original, 1, 60) as ai_wrote,
  substring(corrected, 1, 60) as admin_wrote,
  created_at
from ai_feedback
where user_id = '<your-user-id>'
order by created_at desc;

-- Lihat brand_voice terkini
select brand_voice from profiles where id = '<your-user-id>';
```

Pattern yang konsisten di kolom `admin_wrote` → itulah yang AI pelajari.

---

## Troubleshooting

| Masalah | Kemungkinan penyebab |
|---|---|
| Draft AI selalu kosong | `brand_voice` belum diisi, atau pesan terklasifikasi `sensitif` |
| Koreksi tidak tersimpan | `reply_to_id` tidak terkirim — pastikan ada pesan masuk yang dipilih |
| `brand_voice` tidak berubah setelah 10 koreksi | Kurang dari 3 koreksi di DB (minimum untuk trigger re-analysis) |
| Level 2 tidak muncul | `NEXT_PUBLIC_BETA_MODE` belum `true`, atau `feedback_count` kurang |
| Toast "Koreksi dicatat" tidak muncul | Draft dikirim sama persis dengan `ai_draft_reply` di DB — sistem deteksi tidak ada perubahan |
