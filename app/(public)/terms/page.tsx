import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — Glim",
}

export default function TermsPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@glim.id"
  const today = new Date().toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <article className="prose prose-sm prose-gray max-w-none">
      <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Syarat & Ketentuan</h1>
      <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: {today}</p>

      <Section title="1. Penerimaan Syarat">
        <p>
          Dengan mendaftar, mengakses, atau menggunakan layanan Glim, kamu menyatakan telah membaca,
          memahami, dan menyetujui seluruh syarat dan ketentuan ini. Jika kamu tidak menyetujui,
          harap tidak menggunakan layanan Glim.
        </p>
      </Section>

      <Section title="2. Layanan Glim">
        <p>
          Glim adalah platform AI WhatsApp assistant untuk UMKM Indonesia. Layanan mencakup inbox
          terpusat, reminder otomatis, draft balasan AI, manajemen Client, dan integrasi bisnis.
          Glim tersedia dalam dua paket langganan:
        </p>
        <ul>
          <li>
            <strong>Basic (Rp 299.000/bulan)</strong> — AI assistant, dashboard bisnis, 1 koneksi
            WhatsApp
          </li>
          <li>
            <strong>Pro (Rp 399.000/bulan)</strong> — Semua fitur Basic + integrasi Google
            (Calendar, Sheets, dan layanan Google lainnya)
          </li>
        </ul>
        <p>
          Harga dapat berubah dengan pemberitahuan minimal 30 hari sebelum periode langganan
          berikutnya.
        </p>
      </Section>

      <Section title="3. Akun dan Tanggung Jawab Pengguna">
        <ul>
          <li>Kamu bertanggung jawab penuh atas keamanan akun dan kata sandi</li>
          <li>Kamu bertanggung jawab atas semua konten yang dikirim melalui platform ke Client kamu</li>
          <li>Kamu tidak boleh menggunakan Glim untuk spam, penipuan, atau aktivitas ilegal</li>
          <li>Satu akun diperuntukkan untuk satu bisnis</li>
          <li>
            Kamu wajib memberikan informasi yang akurat saat pendaftaran dan memperbaruinya jika ada
            perubahan
          </li>
        </ul>
      </Section>

      <Section title="4. WhatsApp dan Kebijakan Meta">
        <p>
          Glim menggunakan koneksi WhatsApp <strong>tidak resmi</strong> (melalui library Baileys).
          Koneksi ini bukan bagian dari WhatsApp Business API resmi dari Meta. Dengan menggunakan
          Glim, kamu memahami dan menerima risiko berikut:
        </p>
        <ul>
          <li>
            Meta/WhatsApp dapat memblokir atau membatasi nomor WhatsApp yang terhubung kapan saja
            tanpa pemberitahuan
          </li>
          <li>
            Glim <strong>tidak bertanggung jawab</strong> atas pemblokiran nomor WhatsApp oleh Meta
          </li>
          <li>
            Kami sangat menyarankan menggunakan <strong>nomor bisnis khusus</strong>, bukan nomor
            pribadi utama kamu
          </li>
          <li>
            Fitur dan kompatibilitas koneksi dapat berubah sewaktu-waktu mengikuti perubahan
            kebijakan atau infrastruktur Meta
          </li>
        </ul>
      </Section>

      <Section title="5. Data dan AI">
        <ul>
          <li>
            Percakapan Client kamu diproses oleh AI untuk menghasilkan draft balasan dan klasifikasi
            pesan
          </li>
          <li>
            Kamu bertanggung jawab memastikan Client kamu mengetahui bahwa percakapan mereka diproses
            oleh sistem otomatis
          </li>
          <li>
            Glim tidak bertanggung jawab atas kesalahan draft AI yang dikirim tanpa review manual
            oleh pengguna
          </li>
          <li>
            Percakapan dan media disimpan maksimal 90 hari, setelah itu dihapus secara otomatis
          </li>
          <li>
            Data bisnis kamu (produk, jam operasional, template) digunakan untuk mempersonalisasi
            draft AI dan tidak dibagikan ke pengguna lain
          </li>
        </ul>
      </Section>

      <Section title="6. Pembayaran dan Langganan">
        <p>Glim menyediakan dua paket langganan bulanan:</p>
        <ul>
          <li>
            <strong>Basic:</strong> Rp 299.000/bulan per akun
          </li>
          <li>
            <strong>Pro:</strong> Rp 399.000/bulan per akun
          </li>
        </ul>
        <p>Ketentuan pembayaran:</p>
        <ul>
          <li>
            Pembayaran dilakukan secara <strong>manual</strong> melalui QRIS atau transfer bank.
            Layanan baru aktif setelah pembayaran dikonfirmasi oleh admin Glim
          </li>
          <li>
            <strong>Tidak ada auto-renewal</strong> — layanan aktif selama 1 (satu) bulan terhitung
            dari tanggal konfirmasi pembayaran. Untuk melanjutkan, pengguna perlu melakukan
            pembayaran ulang sebelum masa aktif berakhir
          </li>
          <li>
            Layanan akan dihentikan jika pembayaran tidak dilakukan dalam 7 hari setelah tanggal
            jatuh tempo
          </li>
        </ul>
        <p>
          <strong>Kebijakan Pengembalian Dana (Refund):</strong>
        </p>
        <ul>
          <li>
            Pembayaran pada dasarnya <strong>non-refundable</strong>, kecuali dalam kondisi berikut:
          </li>
          <li>
            (a) Gangguan layanan dari pihak Glim yang berkepanjangan (lebih dari 48 jam berturut-
            turut) yang menyebabkan layanan tidak dapat digunakan
          </li>
          <li>
            (b) Pembayaran ganda (<em>double payment</em>) yang terbukti melalui bukti transfer
          </li>
          <li>
            (c) Pembatalan yang diajukan sebelum layanan diaktifkan oleh admin (sebelum konfirmasi
            pembayaran)
          </li>
          <li>
            Pengajuan refund dikirim ke{" "}
            <a href={`mailto:${email}`} className="text-primary font-medium">
              {email}
            </a>{" "}
            dengan menyertakan bukti pendukung. Proses refund maksimal 14 hari kerja
          </li>
        </ul>
      </Section>

      <Section title="7. Fitur Pro dan Integrasi Google">
        <p>
          Pengguna paket Pro mendapatkan akses ke integrasi dengan layanan Google, termasuk namun
          tidak terbatas pada Google Calendar dan Google Sheets. Ketentuan integrasi:
        </p>
        <ul>
          <li>
            Pengguna wajib memberikan akses OAuth yang diminta saat menghubungkan akun Google.
            Tanpa izin tersebut, fitur integrasi tidak dapat berfungsi
          </li>
          <li>
            Data yang disinkronkan meliputi: jadwal/event (Calendar), data spreadsheet yang
            dipilih (Sheets), dan metadata terkait
          </li>
          <li>
            Glim <strong>tidak menyimpan kredensial Google</strong> (username/password). Akses
            dilakukan melalui token OAuth yang dapat dicabut kapan saja oleh pengguna melalui
            pengaturan akun Google
          </li>
          <li>
            Penggunaan data dari layanan Google tunduk pada{" "}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium"
            >
              Persyaratan Layanan Google
            </a>{" "}
            dan{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium"
            >
              Kebijakan Privasi Google
            </a>
          </li>
        </ul>
      </Section>

      <Section title="8. Batasan Tanggung Jawab">
        <p>
          Glim tidak bertanggung jawab atas kerugian bisnis yang timbul dari gangguan layanan,
          kesalahan draft AI, pemblokiran WhatsApp oleh Meta, atau ketidaktersediaan layanan pihak
          ketiga (termasuk layanan Google). Layanan disediakan &quot;sebagaimana adanya&quot;
          (<em>as is</em>) tanpa jaminan ketersediaan 100%.
        </p>
      </Section>

      <Section title="9. Penghentian Layanan">
        <p>
          Kami berhak menghentikan atau menangguhkan akun yang melanggar ketentuan ini tanpa
          pemberitahuan sebelumnya. Pengguna juga dapat menghentikan langganan kapan saja dengan
          tidak melakukan perpanjangan pembayaran.
        </p>
      </Section>

      <Section title="10. Perubahan Ketentuan">
        <p>
          Ketentuan ini dapat berubah sewaktu-waktu. Pengguna akan diberitahu melalui email atau
          notifikasi di platform minimal 14 hari sebelum perubahan berlaku. Penggunaan layanan
          setelah perubahan berlaku dianggap sebagai persetujuan terhadap ketentuan baru.
        </p>
      </Section>

      <Section title="11. Kepatuhan UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022)">
        <p>
          Glim berkomitmen mematuhi Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data
          Pribadi (UU PDP). Sebagai pengguna Glim, kamu memiliki hak berikut:
        </p>
        <ul>
          <li>
            <strong>Hak akses:</strong> meminta salinan data pribadi yang kami simpan tentang kamu
          </li>
          <li>
            <strong>Hak perbaikan:</strong> meminta koreksi data yang tidak akurat atau tidak
            lengkap
          </li>
          <li>
            <strong>Hak penghapusan:</strong> meminta penghapusan akun dan seluruh data pribadi kamu
            dari sistem kami
          </li>
          <li>
            <strong>Hak portabilitas:</strong> meminta data kamu dalam format yang dapat dibaca mesin
          </li>
        </ul>
        <p>
          Pemrosesan data pribadi dilakukan sesuai dengan Kebijakan Privasi kami. Untuk mengajukan
          permintaan terkait hak data pribadi, hubungi:{" "}
          <a href={`mailto:${email}`} className="text-primary font-medium">
            {email}
          </a>
          . Kami akan merespons permintaan kamu dalam waktu maksimal 3×24 jam kerja.
        </p>
      </Section>

      <Section title="12. Hukum yang Berlaku">
        <p>
          Ketentuan ini tunduk pada dan ditafsirkan berdasarkan hukum Republik Indonesia. Setiap
          perselisihan yang timbul akan diselesaikan secara musyawarah terlebih dahulu, dan jika
          tidak tercapai kesepakatan, akan diselesaikan melalui pengadilan yang berwenang di
          Indonesia.
        </p>
      </Section>

      <p className="text-sm text-gray-500 mt-8">
        Pertanyaan:{" "}
        <a href={`mailto:${email}`} className="text-primary font-medium">
          {email}
        </a>
      </p>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display font-semibold text-base tracking-tight mb-2">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
