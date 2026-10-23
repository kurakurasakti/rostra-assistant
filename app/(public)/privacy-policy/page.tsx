import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Glim",
  description:
    "Kebijakan Privasi Glim disusun sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).",
}

export default function PrivacyPolicyPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@glim.id"
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Glim"
  const today = new Date().toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <article className="prose prose-sm prose-gray max-w-none">
      <h1 className="font-display text-2xl font-bold tracking-tight mb-1 text-gray-900">
        Kebijakan Privasi
      </h1>
      <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: {today}</p>

      <Section title="1. Komitmen Kami terhadap Pelindungan Data Pribadi">
        <p>
          {company} (&quot;kami&quot;, &quot;kita&quot;, atau &quot;Glim&quot;) berkomitmen penuh
          untuk melindungi hak privasi dan keamanan data pribadi setiap pengguna, pelanggan, serta
          mitra bisnis kami. Kebijakan Privasi ini disusun berdasarkan ketentuan{" "}
          <strong>
            Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi
            (UU PDP)
          </strong>{" "}
          serta standar pelindungan data digital yang berlaku.
        </p>
        <p>
          Kebijakan ini menguraikan bagaimana kami memperoleh, mengumpulkan, mengolah, menganalisis,
          menyimpan, memperbaiki, memperbarui, menampilkan, mengumumkan, mentransfer,
          menyebarluaskan, mengungkapkan, dan/atau menghapus serta memusnahkan Data Pribadi kamu
          saat menggunakan platform Glim. Kebijakan ini merupakan satu kesatuan yang tidak
          terpisahkan dari{" "}
          <Link href="/terms" className="text-primary font-medium hover:underline">
            Syarat &amp; Ketentuan
          </Link>{" "}
          dan{" "}
          <Link href="/cookies-policy" className="text-primary font-medium hover:underline">
            Kebijakan Cookie
          </Link>{" "}
          kami.
        </p>
      </Section>

      <Section title="2. Peran: Pengendali Data vs. Prosesor Data">
        <p>
          Sesuai dengan kerangka UU PDP, pembagian peran dalam pemrosesan data diatur sebagai
          berikut:
        </p>
        <ul>
          <li>
            <strong>Glim sebagai Pengendali Data Pribadi (Data Controller):</strong> Untuk informasi
            akun kamu sebagai pemilik bisnis/merchant (seperti nama bisnis, email pendaftaran, kata
            sandi terenkripsi, catatan langganan, dan data penagihan).
          </li>
          <li>
            <strong>
              Kamu sebagai Pengendali Data & Glim sebagai Prosesor Data Pribadi (Data Processor):
            </strong>{" "}
            Untuk seluruh data percakapan WhatsApp, nomor telepon pelanggan, dan data riwayat
            transaksi pelanggan kamu (Client) yang masuk ke platform Glim. Kamu memiliki kendali
            penuh atas data pelanggan kamu, dan Glim hanya memproses data tersebut semata-mata atas
            instruksi dan untuk keperluan penyediaan layanan kepada kamu.
          </li>
        </ul>
      </Section>

      <Section title="3. Dasar Hukum Pemrosesan Data Pribadi">
        <p>
          Kami memproses Data Pribadi kamu hanya berdasarkan dasar hukum yang sah sesuai Pasal 20 UU
          PDP:
        </p>
        <ol className="list-decimal pl-4 space-y-1.5">
          <li>
            <strong>Persetujuan Sah:</strong> Persetujuan eksplisit yang kamu berikan saat mendaftar
            akun, menyetujui Syarat &amp; Ketentuan, dan menghubungkan koneksi WhatsApp.
          </li>
          <li>
            <strong>Pelaksanaan Perjanjian/Kontrak:</strong> Pemrosesan yang diperlukan untuk
            memenuhi kewajiban penyediaan fitur asisten AI, dasbor bisnis, dan manajemen pesanan.
          </li>
          <li>
            <strong>Kewajiban Hukum:</strong> Pemenuhan peraturan perpajakan, penegakan hukum, dan
            kepatuhan regulasi Republik Indonesia.
          </li>
          <li>
            <strong>Kepentingan yang Sah (Legitimate Interests):</strong> Menjaga keamanan siber
            platform, mencegah serangan siber (<em>cyber attack</em>), penipuan (<em>fraud</em>),
            dan penyalahgunaan sistem.
          </li>
        </ol>
      </Section>

      <Section title="4. Jenis Data yang Kami Kumpulkan">
        <p>Kami mengumpulkan kategori data berikut secara terbatas dan relevan:</p>
        <ul>
          <li>
            <strong>Data Identitas & Akun Pengguna:</strong> Nama bisnis, alamat email, nomor
            telepon WhatsApp terhubung, kata sandi (disimpan dalam bentuk hash satu arah
            terenkripsi), dan preferensi bisnis (jam operasional, katalog produk, brand voice).
          </li>
          <li>
            <strong>Data Percakapan WhatsApp:</strong> Teks pesan masuk dan keluar, metadata waktu
            pengiriman, nomor pengirim/penerima, serta berkas media (gambar, audio, dokumen struk
            transfer) yang diterima melalui koneksi WhatsApp.
          </li>
          <li>
            <strong>Data Manajemen Pelanggan (CRM):</strong> Nama kontak pelanggan, catatan profil
            yang kamu tambahkan, riwayat janji temu, dan tahapan pembayaran pesanan.
          </li>
          <li>
            <strong>Data Transaksi & Langganan:</strong> Nomor invoice, paket langganan yang
            dipilih, bukti transfer pembayaran manual (struk bank/QRIS), dan status verifikasi akun.
            Kami <strong>tidak menyimpan nomor kartu kredit/debit</strong>.
          </li>
          <li>
            <strong>Data Teknis & Keamanan:</strong> Alamat IP, jenis peramban (user-agent), log
            aktivitas keamanan autentikasi (untuk mendeteksi brute-force bot), dan status
            persetujuan cookie.
          </li>
          <li>
            <strong>Data Integrasi Pihak Ketiga (Paket Pro):</strong> Token akses OAuth berdurasi
            terbatas untuk sinkronisasi jadwal Google Calendar dan lembar kerja Google Sheets sesuai
            izin eksplisit yang kamu berikan.
          </li>
        </ul>
      </Section>

      <Section title="5. Pemrosesan Kecerdasan Buatan (AI) & Transparansi LLM">
        <p>
          Glim memanfaatkan teknologi model bahasa skala besar (<em>Large Language Model / LLM</em>)
          untuk membantu kamu merespons pelanggan dengan cepat dan efisien:
        </p>
        <ul>
          <li>
            <strong>Tujuan Pemrosesan:</strong> Menghasilkan saran draft pesan balasan (
            <em>AI draft reply</em>) dan mengklasifikasikan pesan secara otomatis (misalnya:
            pertanyaan umum, komplain sensitif, atau upaya manipulasi prompt).
          </li>
          <li>
            <strong>Prinsip Tanpa Pelatihan Publik:</strong> Pesan dan data bisnis kamu{" "}
            <strong>TIDAK DIGUNAKAN</strong> untuk melatih (<em>training</em>) model AI publik umum.
            Data hanya diteruskan secara aman ke API provider AI berlisensi untuk keperluan
            inferensi sesaat.
          </li>
          <li>
            <strong>Pemindaian Keamanan Prompt Injection:</strong> Setiap pesan masuk dipindai
            secara otomatis untuk mendeteksi upaya peretasan berbasis prompt injection atau
            instruksi jahat yang bertujuan memanipulasi sistem asisten AI kamu. Pesan mencurigakan
            akan langsung dieskalasi kepada kamu tanpa jawaban otomatis.
          </li>
          <li>
            <strong>Kontrol Manusia (Human-in-the-Loop):</strong> Seluruh draft balasan yang
            dihasilkan AI dapat kamu tinjau, edit, atau batalkan sebelum dikirimkan ke pelanggan
            kamu.
          </li>
        </ul>
      </Section>

      <Section title="6. Penyimpanan, Retensi, dan Penghapusan Data">
        <ul>
          <li>
            <strong>Infrastruktur Terenkripsi:</strong> Seluruh basis data kami dihosting di
            infrastruktur cloud Supabase yang berstandar internasional dengan sertifikasi SOC 2 Type
            II dan ISO 27001.
          </li>
          <li>
            <strong>Retensi Percakapan WhatsApp (90 Hari):</strong> Demi menjaga kebersihan data dan
            mengurangi risiko privasi, riwayat pesan obrolan dan berkas media WhatsApp disimpan{" "}
            <strong>maksimal selama 90 hari kalender</strong>, setelah itu akan dihapus secara
            otomatis dan permanen dari basis data kami.
          </li>
          <li>
            <strong>Retensi Data Penagihan:</strong> Data invoice dan bukti transaksi keuangan
            disimpan selama periode yang diwajibkan oleh ketentuan hukum perpajakan dan akuntansi di
            Indonesia.
          </li>
          <li>
            <strong>Penghapusan Akun Pengguna:</strong> Apabila kamu memutuskan untuk menutup atau
            menghapus akun, seluruh profil bisnis, template, kontak pelanggan, dan data percakapan
            akan dihapus secara permanen dalam waktu maksimal 30 hari kalender.
          </li>
        </ul>
      </Section>

      <Section title="7. Langkah-Langkah Keamanan Teknis (Technical Safeguards)">
        <p>Kami menerapkan langkah-langkah pengamanan ketat untuk mencegah kebocoran data:</p>
        <ul>
          <li>
            <strong>Row Level Security (RLS) di Tingkat Database:</strong> Pemisahan data
            antar-tenant secara mutlak di level PostgreSQL engine. Pengguna lain tidak memiliki
            akses fisik atau logis ke data kamu.
          </li>
          <li>
            <strong>Enkripsi Data:</strong> Enkripsi data saat transit (<em>in-transit</em>)
            menggunakan TLS 1.3 modern dan enkripsi data saat diam (<em>at-rest</em>) menggunakan
            AES-256.
          </li>
          <li>
            <strong>Private Storage Buckets & Signed URLs:</strong> Berkas sensitif seperti bukti
            pembayaran disimpan di bucket privat tanpa akses publik langsung. Akses hanya dapat
            dibuka melalui URL bertanda tangan kriptografis (<em>signed URL</em>) dengan batas
            kedaluwarsa 5 menit.
          </li>
          <li>
            <strong>Pertahanan Anti-Brute Force:</strong> Rate limiter otomatis, deteksi bot
            honeypot, dan penguncian akun sementara pada endpoint login untuk menghentikan serangan
            peretasan kredensial.
          </li>
          <li>
            <strong>Prinsip Hak Akses Terkecil (Least Privilege):</strong> Hanya personel berwenang
            dengan keperluan operasional esensial yang dapat mengakses sistem backend melalui
            autentikasi multi-faktor.
          </li>
        </ul>
      </Section>

      <Section title="8. Pembagian Data kepada Sub-Prosesor Pihak Ketiga">
        <p>
          Kami tidak pernah menjual, menyewakan, atau memperdagangkan data pribadi kamu kepada pihak
          ketiga. Kami hanya membagikan data kepada mitra sub-prosesor yang terikat perjanjian
          kerahasiaan ketat semata-mata untuk mengoperasikan layanan:
        </p>
        <div className="overflow-x-auto my-3">
          <table className="w-full text-xs border border-gray-200 rounded-lg">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-2.5 text-left font-semibold">Sub-Prosesor</th>
                <th className="p-2.5 text-left font-semibold">Peran / Layanan</th>
                <th className="p-2.5 text-left font-semibold">Lokasi / Kepatuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="p-2.5 font-medium">Supabase</td>
                <td className="p-2.5">
                  Penyimpanan basis data, autentikasi terenkripsi, file storage
                </td>
                <td className="p-2.5">Cloud / SOC 2 Type II, ISO 27001</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">OpenRouter / DeepSeek</td>
                <td className="p-2.5">
                  Pemrosesan inferensi bahasa AI untuk pembuatan draft balasan
                </td>
                <td className="p-2.5">API Terenkripsi / Zero Retention Policy</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Vercel Inc.</td>
                <td className="p-2.5">
                  Hosting serverless web application dan pengiriman konten aman
                </td>
                <td className="p-2.5">Cloud Global / SOC 2 Type II</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Google APIs (Paket Pro)</td>
                <td className="p-2.5">
                  Integrasi opsional sinkronisasi Google Calendar dan Sheets
                </td>
                <td className="p-2.5">Google User Data Policy & OAuth 2.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="9. Hak-Hak Kamu sebagai Subjek Data Pribadi (UU PDP)">
        <p>
          Berdasarkan Bab IV Bagian Kedua UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi,
          kamu memiliki hak-hak hukum berikut:
        </p>
        <ul>
          <li>
            <strong>Hak Mendapatkan Informasi:</strong> Mengetahui kejelasan identitas, dasar
            kepentingan hukum, tujuan permintaan dan penggunaan data pribadi.
          </li>
          <li>
            <strong>Hak Melengkapi dan Memperbaiki:</strong> Mengoreksi atau memperbarui data
            pribadi yang tidak akurat, tidak lengkap, atau tidak mutakhir melalui menu pengaturan
            aplikasi.
          </li>
          <li>
            <strong>Hak Mengakses dan Memperoleh Salinan (Portabilitas):</strong> Meminta akses dan
            memperoleh salinan data pribadi kamu dalam format digital yang umum digunakan dan dapat
            dibaca mesin.
          </li>
          <li>
            <strong>Hak Mengakhiri Pemrosesan dan Menghapus (Right to Erasure):</strong> Meminta
            penghentian pemrosesan, penghapusan, atau pemusnahan data pribadi kamu dari sistem kami.
          </li>
          <li>
            <strong>Hak Menarik Persetujuan:</strong> Menarik kembali persetujuan pemrosesan data
            pribadi yang sebelumnya telah kamu berikan.
          </li>
          <li>
            <strong>Hak Menolak Keputusan Otomatis:</strong> Mengajukan keberatan terhadap tindakan
            pengambilan keputusan yang hanya didasarkan pada pemrosesan otomatis (termasuk profil
            AI).
          </li>
        </ul>
      </Section>

      <Section title="10. Tata Cara Pelaksanaan Hak Subjek Data">
        <p>
          Untuk mengajukan permohonan pelaksanaan hak-hak kamu sebagaimana tercantum di atas, kamu
          dapat mengirimkan permohonan resmi kepada Petugas Pelindungan Data (
          <em>Data Protection Officer</em>) kami melalui:
        </p>
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 my-2 text-xs space-y-1.5">
          <p>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${email}`} className="text-primary font-medium hover:underline">
              {email}
            </a>
          </p>
          <p>
            <strong>Subjek Email:</strong> Permohonan Hak Subjek Data Pribadi — [Nama Bisnis / Email
            Akun]
          </p>
          <p>
            <strong>Waktu Tanggapan (SLA):</strong> Kami akan memverifikasi identitas kamu dan
            memberikan tanggapan resmi dalam waktu paling lambat <strong>3 × 24 jam kerja</strong>{" "}
            sejak permohonan lengkap diterima.
          </p>
        </div>
      </Section>

      <Section title="11. Kebijakan Privasi Anak">
        <p>
          Layanan Glim ditujukan secara eksklusif untuk pelaku usaha, profesional, dan individu yang
          telah cakap secara hukum (berusia 18 tahun ke atas atau telah menikah). Kami tidak pernah
          secara sadar mengumpulkan atau memproses data pribadi anak di bawah umur.
        </p>
      </Section>

      <Section title="12. Perubahan atas Kebijakan Privasi Ini">
        <p>
          Kami dapat meninjau dan memperbarui Kebijakan Privasi ini secara berkala guna mencerminkan
          perubahan pada fitur platform atau kewajiban hukum yang berlaku. Jika terdapat perubahan
          material, kami akan memberikan pemberitahuan melalui email terdaftar atau banner
          pengumuman di dalam dasbor Glim minimal 14 (empat belas) hari sebelum perubahan
          diberlakukan secara efektif.
        </p>
      </Section>

      <Section title="13. Hubungi Kami">
        <p>
          Apabila kamu memiliki pertanyaan, pengaduan, atau kekhawatiran terkait perlindungan
          privasi dan data kamu, silakan hubungi kami di:
        </p>
        <p className="font-medium text-gray-800">
          {company} — Tim Pelindungan Data Pribadi
          <br />
          Email:{" "}
          <a href={`mailto:${email}`} className="text-primary hover:underline">
            {email}
          </a>
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display font-semibold text-base tracking-tight mb-2 text-gray-900">
        {title}
      </h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
