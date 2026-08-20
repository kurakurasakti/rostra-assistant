import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Glim",
}

export default function PrivacyPolicyPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@glim.id"
  const today = new Date().toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <article className="prose prose-sm prose-gray max-w-none">
      <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Kebijakan Privasi</h1>
      <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: {today}</p>

      <Section title="1. Pendahuluan">
        <p>
          Glim adalah platform AI WhatsApp assistant untuk UMKM Indonesia. Kebijakan Privasi ini
          menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data kamu
          sesuai dengan Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).
        </p>
        <p>
          Dengan menggunakan layanan Glim, kamu menyetujui praktik pengelolaan data yang dijelaskan
          dalam kebijakan ini.
        </p>
      </Section>

      <Section title="2. Data yang Kami Kumpulkan">
        <ul>
          <li>
            <strong>Informasi akun:</strong> nama bisnis, alamat email, nomor WhatsApp
          </li>
          <li>
            <strong>Data bisnis:</strong> produk/jasa, jam operasional, template pesan, informasi
            brand voice
          </li>
          <li>
            <strong>Percakapan WhatsApp:</strong> pesan masuk dan keluar yang diproses melalui
            platform Glim
          </li>
          <li>
            <strong>Data Client:</strong> nama, nomor WhatsApp, dan riwayat interaksi Client bisnis
            kamu
          </li>
          <li>
            <strong>Data pesanan:</strong> informasi pesanan, jadwal, dan pembayaran
          </li>
          <li>
            <strong>Data pembayaran:</strong> bukti transfer, informasi pengirim, metode pembayaran
            (kami <strong>tidak</strong> menyimpan nomor kartu kredit/debit)
          </li>
          <li>
            <strong>Data integrasi (paket Pro):</strong> data yang disinkronkan dari layanan Google
            (Calendar, Sheets) sesuai izin OAuth yang diberikan pengguna
          </li>
        </ul>
      </Section>

      <Section title="3. Bagaimana Kami Menggunakan Data">
        <ul>
          <li>Menjalankan dan menyediakan fitur platform Glim</li>
          <li>Menghasilkan draft balasan AI berdasarkan konteks bisnis kamu</li>
          <li>Mengirim pengingat otomatis ke Client kamu</li>
          <li>Meningkatkan akurasi AI dari koreksi yang kamu berikan</li>
          <li>Memproses dan memverifikasi pembayaran langganan</li>
          <li>Menyinkronkan data dengan layanan Google untuk pengguna paket Pro</li>
          <li>Mengirim notifikasi terkait layanan, pembaruan, dan informasi keamanan akun</li>
        </ul>
        <p>
          Kami <strong>tidak</strong> menggunakan data kamu untuk iklan pihak ketiga atau menjual
          data kamu kepada pihak manapun.
        </p>
      </Section>

      <Section title="4. Penyimpanan dan Keamanan Data">
        <ul>
          <li>
            Data disimpan di server <strong>Supabase</strong> dengan infrastruktur cloud yang aman
          </li>
          <li>
            Percakapan WhatsApp dan media (foto, dokumen) disimpan <strong>maksimal 90 hari</strong>,
            setelah itu dihapus secara otomatis
          </li>
          <li>Kami tidak menjual, menyewakan, atau membagikan data kamu ke pihak ketiga</li>
        </ul>
        <p>Langkah keamanan yang kami terapkan:</p>
        <ul>
          <li>
            <strong>Row Level Security (RLS):</strong> setiap pengguna hanya dapat mengakses data
            miliknya sendiri di tingkat database
          </li>
          <li>
            <strong>Enkripsi in-transit:</strong> semua komunikasi dilindungi dengan HTTPS/TLS
          </li>
          <li>
            <strong>Akses terbatas:</strong> hanya personel yang berwenang yang memiliki akses ke
            infrastruktur dan data, dengan prinsip <em>least privilege</em>
          </li>
          <li>
            <strong>Bukti pembayaran:</strong> disimpan di storage privat dengan akses melalui signed
            URL berdurasi terbatas
          </li>
          <li>
            <strong>Token Google OAuth (Pro):</strong> disimpan secara aman dan dapat dicabut kapan
            saja oleh pengguna melalui pengaturan akun Google
          </li>
        </ul>
      </Section>

      <Section title="5. Layanan Pihak Ketiga">
        <p>
          Glim menggunakan layanan pihak ketiga berikut untuk menjalankan platform. Data yang
          dibagikan terbatas pada kebutuhan operasional layanan:
        </p>
        <ul>
          <li>
            <strong>Supabase:</strong> penyimpanan database, autentikasi, dan file storage
          </li>
          <li>
            <strong>DeepSeek / OpenRouter:</strong> pemrosesan teks AI untuk menghasilkan draft
            balasan (konten percakapan dikirim ke API provider AI untuk diproses)
          </li>
          <li>
            <strong>Baileys:</strong> library koneksi WhatsApp (tidak resmi dari Meta)
          </li>
          <li>
            <strong>Google APIs (paket Pro):</strong> integrasi Calendar dan Sheets melalui OAuth 2.0
          </li>
          <li>
            <strong>Vercel:</strong> hosting dan deployment aplikasi
          </li>
        </ul>
        <p>
          Setiap layanan pihak ketiga memiliki kebijakan privasi tersendiri. Kami mendorong pengguna
          untuk meninjau kebijakan masing-masing penyedia layanan.
        </p>
      </Section>

      <Section title="6. Tanggung Jawab Pengguna atas Data Client">
        <p>
          Sebagai pengguna Glim, kamu bertindak sebagai <strong>pengendali data</strong> atas data
          Client bisnis kamu (pelanggan UMKM). Kamu bertanggung jawab untuk:
        </p>
        <ul>
          <li>
            Menginformasikan kepada Client bahwa percakapan mereka diproses oleh sistem otomatis
            (AI) melalui platform Glim
          </li>
          <li>
            Memastikan bahwa pengumpulan dan penggunaan data Client sesuai dengan peraturan yang
            berlaku
          </li>
          <li>
            Merespons permintaan dari Client terkait akses, koreksi, atau penghapusan data mereka
          </li>
        </ul>
        <p>
          Glim bertindak sebagai <strong>pemroses data</strong> yang memproses data Client atas
          instruksi dan tanggung jawab pengguna.
        </p>
      </Section>

      <Section title="7. Hak Pengguna (Sesuai UU No. 27 Tahun 2022)">
        <p>
          Berdasarkan UU Pelindungan Data Pribadi (UU PDP), kamu memiliki hak-hak berikut atas data
          pribadi kamu:
        </p>
        <ul>
          <li>
            <strong>Hak akses:</strong> meminta informasi mengenai data pribadi yang kami simpan dan
            proses
          </li>
          <li>
            <strong>Hak koreksi:</strong> meminta perbaikan atas data yang tidak akurat atau tidak
            lengkap
          </li>
          <li>
            <strong>Hak penghapusan:</strong> meminta penghapusan akun dan seluruh data pribadi kamu
            dari sistem kami
          </li>
          <li>
            <strong>Hak portabilitas:</strong> meminta salinan data pribadi kamu dalam format yang
            dapat dibaca mesin
          </li>
          <li>
            <strong>Hak keberatan:</strong> menolak pemrosesan data pribadi dalam kondisi tertentu
            sesuai UU PDP
          </li>
        </ul>
        <p>
          <strong>Cara mengajukan permintaan:</strong> kirim email ke{" "}
          <a href={`mailto:${email}`} className="text-primary font-medium">
            {email}
          </a>{" "}
          dengan subjek &quot;Permintaan Data Pribadi&quot; beserta detail permintaan kamu. Kami akan
          memverifikasi identitas kamu dan merespons dalam waktu maksimal{" "}
          <strong>3×24 jam kerja</strong>.
        </p>
      </Section>

      <Section title="8. Perubahan Kebijakan">
        <p>
          Kebijakan Privasi ini dapat diperbarui sewaktu-waktu. Kami akan memberitahu perubahan
          material melalui email atau notifikasi di platform minimal 14 hari sebelum perubahan
          berlaku. Penggunaan layanan setelah perubahan berlaku dianggap sebagai persetujuan terhadap
          kebijakan baru.
        </p>
      </Section>

      <Section title="9. Kontak">
        <p>
          Untuk pertanyaan, keluhan, atau permintaan terkait privasi dan data pribadi, hubungi kami
          di:{" "}
          <a href={`mailto:${email}`} className="text-primary font-medium">
            {email}
          </a>
        </p>
        <p className="text-sm text-gray-500 mt-1">Tanggal berlaku: {today}</p>
      </Section>
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
