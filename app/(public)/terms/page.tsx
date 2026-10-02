import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — Glim",
  description:
    "Syarat dan Ketentuan Layanan Glim sesuai dengan hukum dan peraturan perundang-undangan Republik Indonesia.",
}

export default function TermsPage() {
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
        Syarat & Ketentuan Layanan
      </h1>
      <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: {today}</p>

      <Section title="1. Penerimaan Syarat & Perjanjian yang Mengikat">
        <p>
          Selamat datang di {company} (&quot;Glim&quot;, &quot;kami&quot;, atau &quot;kita&quot;).
          Dengan mendaftar, mengakses, atau menggunakan situs web, perangkat lunak, dan platform
          asisten AI WhatsApp kami, kamu menyatakan bahwa kamu telah membaca, memahami, dan
          menyetujui untuk terikat secara hukum oleh Syarat &amp; Ketentuan ini, bersama dengan{" "}
          <Link href="/privacy-policy" className="text-primary font-medium hover:underline">
            Kebijakan Privasi
          </Link>{" "}
          dan{" "}
          <Link href="/cookies-policy" className="text-primary font-medium hover:underline">
            Kebijakan Cookie
          </Link>{" "}
          kami.
        </p>
        <p>
          Jika kamu tidak menyetujui salah satu atau seluruh ketentuan ini, kamu tidak diperkenankan
          mengakses atau menggunakan layanan Glim.
        </p>
      </Section>

      <Section title="2. Deskripsi Layanan Glim">
        <p>
          Glim adalah platform perangkat lunak berbasis cloud (SaaS) yang dirancang untuk membantu
          Usaha Mikro, Kecil, dan Menengah (UMKM) serta pemilik bisnis mengelola komunikasi WhatsApp
          pelanggan secara efisien. Fitur platform mencakup:
        </p>
        <ul>
          <li>
            Kotak masuk terpadu (<em>unified inbox</em>) untuk mengelola obrolan pelanggan
          </li>
          <li>Pembuatan saran draft balasan otomatis berbasis kecerdasan buatan (AI)</li>
          <li>
            Pengingat pembayaran (<em>payment reminder</em>) dan penjadwalan janji temu otomatis
          </li>
          <li>Manajemen kontak pelanggan (CRM) dan pencatatan pesanan</li>
          <li>Integrasi produktivitas dengan layanan Google (khusus paket Pro)</li>
        </ul>
      </Section>

      <Section title="3. Pendaftaran Akun & Kewajiban Pengguna">
        <ul>
          <li>
            <strong>Kelayakan:</strong> Kamu harus berusia minimal 18 tahun atau telah cakap
            melakukan tindakan hukum untuk membuat akun di platform Glim.
          </li>
          <li>
            <strong>Akurasi Informasi:</strong> Kamu wajib memberikan informasi pendaftaran yang
            benar, akurat, dan mutakhir.
          </li>
          <li>
            <strong>Kerahasiaan Akun:</strong> Kamu bertanggung jawab penuh menjaga kerahasiaan kata
            sandi dan kredensial akun kamu. Setiap aktivitas yang terjadi di bawah akun kamu
            sepenuhnya menjadi tanggung jawab kamu.
          </li>
          <li>
            <strong>Satu Akun per Bisnis:</strong> Setiap akun diperuntukkan untuk satu entitas
            bisnis dan tidak boleh dialihkan kepada pihak lain tanpa persetujuan tertulis dari Glim.
          </li>
        </ul>
      </Section>

      <Section title="4. Kebijakan Penggunaan yang Diperbolehkan (Acceptable Use Policy)">
        <p>
          Demi menjaga integritas sistem dan kepatuhan hukum, kamu setuju untuk{" "}
          <strong>TIDAK MENGGUNAKAN</strong> Glim untuk:
        </p>
        <ul>
          <li>
            Mengirimkan pesan massal tanpa persetujuan (<em>unsolicited bulk spam</em>) atau
            melakukan <em>blast</em> ke nomor yang tidak memiliki hubungan bisnis dengan kamu
          </li>
          <li>
            Melakukan penipuan, phishing, pemerasan, atau menyebarkan informasi palsu (
            <em>hoaks</em>)
          </li>
          <li>
            Mempromosikan konten terlarang, perjudian online, narkotika, obat terlarang, pornografi,
            atau produk/jasa ilegal lainnya menurut hukum Republik Indonesia
          </li>
          <li>Mengirimkan ujaran kebencian, pelecehan, ancaman, atau diskriminasi SARA</li>
          <li>
            Mencoba meretas, melakukan rekayasa balik (<em>reverse engineering</em>), atau
            menyusupkan kode berbahaya (virus, bot manipulasi, prompt injection berbahaya) ke sistem
            Glim
          </li>
          <li>
            Mengumpulkan data pribadi pelanggan secara melawan hukum atau melanggar hak privasi
            pihak ketiga
          </li>
        </ul>
        <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200 mt-2">
          Pelanggaran terhadap ketentuan penggunaan ini dapat mengakibatkan penangguhan atau
          pemutusan akun secara permanen tanpa pengembalian dana, serta pelaporan kepada pihak
          berwajib jika terdapat indikasi tindak pidana.
        </p>
      </Section>

      <Section title="5. WhatsApp & Pengakuan Risiko Pihak Ketiga">
        <p>
          Glim menghubungkan WhatsApp melalui protokol antarmuka non-resmi (library Baileys) dan
          bukan merupakan bagian dari WhatsApp Business API resmi dari Meta Platforms, Inc. Dengan
          menggunakan layanan ini, kamu memahami, menyetujui, dan menerima sepenuhnya ketentuan
          berikut:
        </p>
        <ul>
          <li>
            Meta/WhatsApp memiliki kebijakan independen terkait aktivitas otomatisasi dan berhak
            memblokir, menangguhkan, atau membatasi nomor WhatsApp kamu kapan saja
          </li>
          <li>
            Glim <strong>TIDAK BERTANGGUNG JAWAB</strong> atas tindakan pemblokiran atau pembatasan
            nomor WhatsApp yang dilakukan oleh Meta/WhatsApp
          </li>
          <li>
            Kamu sangat disarankan menggunakan{" "}
            <strong>nomor WhatsApp operasional bisnis khusus</strong> dan bukan nomor pribadi utama
            kamu
          </li>
          <li>
            Kamu bertanggung jawab mematuhi Ketentuan Layanan WhatsApp dan Kebijakan Perdagangan
            WhatsApp yang berlaku
          </li>
        </ul>
      </Section>

      <Section title="6. Tanggung Jawab Penggunaan AI & Data Pelanggan">
        <ul>
          <li>
            <strong>Human-in-the-Loop:</strong> Fitur draft AI dirancang sebagai asisten pemberi
            saran. Kamu memiliki kewajiban untuk memeriksa ketepatan draft balasan sebelum
            mengirimkannya kepada pelanggan.
          </li>
          <li>
            <strong>Pemberitahuan kepada Pelanggan:</strong> Sebagai Pengendali Data atas pelanggan
            kamu, kamu bertanggung jawab memastikan bahwa pelanggan kamu mengetahui bahwa komunikasi
            mereka diproses oleh sistem asisten digital.
          </li>
          <li>
            <strong>Retensi Data 90 Hari:</strong> Pesan WhatsApp dan berkas media disimpan maksimal
            selama <strong>90 hari kalender</strong>, setelah itu akan dihapus secara otomatis demi
            keamanan privasi.
          </li>
        </ul>
      </Section>

      <Section title="7. Langganan, Pembayaran & Kebijakan Refund">
        <p>
          Glim menyediakan paket langganan bulanan tanpa perpanjangan otomatis paksa (
          <em>no hidden auto-charge</em>):
        </p>
        <ul>
          <li>
            <strong>Metode Pembayaran:</strong> Pembayaran dilakukan secara manual via transfer Bank
            atau QRIS. Layanan aktif setelah bukti pembayaran diverifikasi oleh admin.
          </li>
          <li>
            <strong>Masa Aktif:</strong> Akun aktif selama 30 hari kalender sejak tanggal
            konfirmasi. Pengguna dapat memperpanjang dengan melakukan pembayaran ulang menjelang
            akhir periode.
          </li>
          <li>
            <strong>Kebijakan Pengembalian Dana (Refund):</strong> Pembayaran pada dasarnya bersifat
            final dan <em>non-refundable</em>, kecuali jika terjadi:
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>
                Gangguan sistem total dari pihak Glim yang berlangsung lebih dari 48 jam
                berturut-turut
              </li>
              <li>
                Pembayaran ganda (<em>double transfer</em>) yang terbukti sah
              </li>
              <li>Pembatalan sebelum verifikasi dan aktivasi layanan oleh admin</li>
            </ul>
          </li>
        </ul>
      </Section>

      <Section title="8. Fitur Integrasi Google (Paket Pro)">
        <p>Bagi pengguna paket Pro yang mengaktifkan integrasi Google Calendar dan Sheets:</p>
        <ul>
          <li>Akses dilakukan secara aman melalui protokol OAuth 2.0 resmi Google</li>
          <li>Glim tidak pernah melihat atau menyimpan kata sandi akun Google kamu</li>
          <li>
            Kamu dapat mencabut izin akses kapan saja melalui pengaturan keamanan akun Google kamu
          </li>
          <li>
            Penggunaan data yang diterima dari Google API tunduk pada{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Kebijakan Data Pengguna Layanan Google API
            </a>
          </li>
        </ul>
      </Section>

      <Section title="9. Batasan Tanggung Jawab & Jaminan">
        <p>
          Layanan Glim disediakan atas dasar &quot;sebagaimana adanya&quot; (<em>as is</em>) dan
          &quot;sebagaimana tersedia&quot; (<em>as available</em>). Sejauh diizinkan oleh hukum yang
          berlaku di Indonesia, Glim tidak memberikan jaminan tersirat atas kelayakan komersial atau
          ketiadaan gangguan sistem secara sempurna.
        </p>
        <p>
          Glim tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan bisnis,
          kehilangan pelanggan, atau kerugian data akibat pemblokiran nomor oleh pihak ketiga
          (WhatsApp/Meta), kelalaian pengguna dalam memeriksa draft AI, atau peristiwa keadaan kahar
          (<em>force majeure</em>).
        </p>
      </Section>

      <Section title="10. Kepatuhan UU Pelindungan Data Pribadi (UU PDP)">
        <p>
          Ketentuan mengenai perolehan, pemrosesan, penyimpanan, dan penghapusan data pribadi diatur
          secara terperinci dalam{" "}
          <Link href="/privacy-policy" className="text-primary font-medium hover:underline">
            Kebijakan Privasi Glim
          </Link>
          . Kedua pihak sepakat untuk mematuhi seluruh kewajiban masing-masing berdasarkan UU No. 27
          Tahun 2022 tentang Pelindungan Data Pribadi.
        </p>
      </Section>

      <Section title="11. Hukum yang Berlaku & Penyelesaian Sengketa">
        <p>
          Syarat &amp; Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Negara Republik
          Indonesia. Setiap perselisihan yang timbul sehubungan dengan pelaksanaan perjanjian ini
          akan diselesaikan secara musyawarah untuk mufakat. Apabila tidak tercapai mufakat dalam
          waktu 30 (tiga puluh) hari, sengketa akan diselesaikan melalui yurisdiksi Pengadilan
          Negeri yang berwenang di wilayah hukum Republik Indonesia.
        </p>
      </Section>

      <Section title="12. Kontak & Layanan Dukungan">
        <p>
          Jika kamu memiliki pertanyaan mengenai Syarat &amp; Ketentuan ini, silakan hubungi tim
          kami di:
        </p>
        <p className="font-medium text-gray-800">
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
