import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Kebijakan Cookie — Glim",
  description:
    "Kebijakan Penggunaan Cookie dan Teknologi Pelacak Glim sesuai UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022).",
}

export default function CookiesPolicyPage() {
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
        Kebijakan Cookie & Teknologi Penyimpanan
      </h1>
      <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: {today}</p>

      <Section title="1. Pendahuluan">
        <p>
          Kebijakan Cookie ini menjelaskan bagaimana {company} (&quot;kami&quot; atau
          &quot;Glim&quot;) menggunakan cookie, penyimpanan lokal (<em>local storage</em>), dan
          teknologi penyimpanan serupa saat kamu mengakses dan menggunakan situs web serta platform
          aplikasi Glim.
        </p>
        <p>
          Kebijakan ini disusun dengan mematuhi prinsip transparansi dan perlindungan privasi
          pengguna sesuai dengan{" "}
          <strong>
            Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)
          </strong>{" "}
          serta standar privasi digital yang berlaku.
        </p>
      </Section>

      <Section title="2. Apa Itu Cookie & Teknologi Penyimpanan Lokal?">
        <p>
          <strong>Cookie</strong> adalah berkas teks kecil yang disimpan di perangkat kamu
          (komputer, tablet, atau smartphone) oleh peramban (<em>browser</em>) saat kamu mengunjungi
          sebuah situs web. Cookie membantu situs web mengingat preferensi kamu, menjaga kamu tetap
          masuk ke akun, dan meningkatkan keamanan aplikasi.
        </p>
        <p>
          Selain cookie standar, kami juga memanfaatkan teknologi penyimpanan web modern seperti:
        </p>
        <ul>
          <li>
            <strong>Local Storage & Session Storage:</strong> penyimpanan data lokal pada peramban
            kamu untuk menyimpan preferensi antarmuka pengguna tanpa membebani setiap lalu lintas
            jaringan server.
          </li>
          <li>
            <strong>Token Keamanan:</strong> token terenkripsi yang digunakan secara eksklusif untuk
            memvalidasi sesi login dan mencegah serangan keamanan seperti pemalsuan permintaan
            antar-situs (CSRF).
          </li>
        </ul>
      </Section>

      <Section title="3. Kategori Cookie yang Kami Gunakan">
        <p>
          Kami membatasi penggunaan cookie dan teknologi penyimpanan hanya pada fungsi-fungsi yang
          benar-benar dibutuhkan untuk menyediakan layanan yang aman dan efisien:
        </p>

        <div className="space-y-4 my-4">
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-display font-semibold text-sm text-gray-900 mb-1">
              A. Cookie Sangat Penting / Esensial (Strictly Necessary Cookies)
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              Cookie ini mutlak diperlukan agar platform dapat beroperasi dengan semestinya dan
              aman. Tanpa cookie ini, kamu tidak dapat masuk ke akun, mengakses dasbor, atau
              menggunakan fitur inti Glim.
            </p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              <li>
                <strong>sb-*-auth-token:</strong> Token sesi terenkripsi Supabase Auth untuk menjaga
                kamu tetap login secara aman.
              </li>
              <li>
                <strong>Security & CSRF Protection:</strong> Token verifikasi permintaan untuk
                mencegah penyerangan pemalsuan sesi dan brute-force bot.
              </li>
              <li>
                <strong>Durasi simpan:</strong> Berakhir saat sesi habis atau saat kamu keluar
                (logout) dari akun.
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <h3 className="font-display font-semibold text-sm text-gray-900 mb-1">
              B. Cookie Preferensi & Fungsional (Functional & Preference Cookies)
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              Cookie dan penyimpanan lokal ini digunakan untuk mengingat pilihan dan kustomisasi
              tampilan antarmuka yang kamu tentukan demi kenyamanan penggunaan.
            </p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              <li>
                <strong>theme:</strong> Menyimpan preferensi tema tampilan (mode terang atau gelap).
              </li>
              <li>
                <strong>glim_cookie_consent:</strong> Menyimpan catatan pilihan persetujuan cookie
                yang telah kamu berikan agar banner konfirmasi tidak muncul berulang kali.
              </li>
              <li>
                <strong>Durasi simpan:</strong> Hingga 12 bulan atau sampai kamu membersihkan data
                peramban.
              </li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="4. Penegasan: Tanpa Cookie Iklan Pihak Ketiga">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-primary mb-1">Prinsip Privasi Tanpa Iklan:</p>
          <p>
            <strong>
              Glim TIDAK menggunakan cookie iklan pihak ketiga (third-party advertising cookies)
            </strong>
            , jaringan iklan berbasis perilaku lintas situs (<em>cross-site tracking</em>), ataupun
            broker data komersial. Kami tidak pernah dan tidak akan menjual data perilaku
            penjelajahan kamu kepada pihak pengiklan mana pun.
          </p>
        </div>
      </Section>

      <Section title="5. Masa Penyimpanan Data Cookie">
        <ul>
          <li>
            <strong>Cookie Sesi (Session Cookies):</strong> Cookie yang bersifat sementara dan akan
            otomatis terhapus begitu kamu menutup jendela peramban.
          </li>
          <li>
            <strong>Cookie Persisten (Persistent Cookies):</strong> Cookie yang tetap tersimpan di
            perangkat kamu selama periode waktu tertentu (maksimal 12 bulan) atau sampai kamu
            menghapusnya secara manual melalui pengaturan peramban.
          </li>
        </ul>
      </Section>

      <Section title="6. Bagaimana Cara Mengelola & Menolak Cookie?">
        <p>Kamu memiliki kontrol penuh atas penggunaan cookie di perangkat kamu:</p>
        <ol className="list-decimal pl-4 space-y-2">
          <li>
            <strong>Melalui Banner & Pengaturan Glim:</strong> Kamu dapat menyesuaikan preferensi
            cookie kamu kapan saja dengan menekan tombol{" "}
            <strong>&quot;Preferensi Cookie&quot;</strong> yang terdapat di bagian bawah (footer)
            halaman situs kami.
          </li>
          <li>
            <strong>Melalui Pengaturan Peramban (Browser):</strong> Sebagian besar peramban web
            memungkinkan kamu untuk melihat, memblokir, atau menghapus cookie melalui menu
            pengaturan privasi:
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Google Chrome: Pengaturan &gt; Privasi dan Keamanan &gt; Cookie pihak ketiga</li>
              <li>
                Mozilla Firefox: Pengaturan &gt; Privasi &amp; Keamanan &gt; Cookie dan Data Situs
              </li>
              <li>Apple Safari: Preferensi &gt; Privasi &gt; Kelola Data Situs Web</li>
              <li>Microsoft Edge: Pengaturan &gt; Cookie dan Izin Situs</li>
            </ul>
          </li>
        </ol>
        <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
          <strong>Perhatian:</strong> Menonaktifkan cookie esensial melalui pengaturan peramban
          dapat mengakibatkan fitur autentikasi dan dasbor Glim tidak dapat berfungsi dengan normal.
        </p>
      </Section>

      <Section title="7. Hubungan dengan Kebijakan Privasi">
        <p>
          Penggunaan cookie yang melibatkan pengumpulan atau pemrosesan data pribadi tunduk pada{" "}
          <Link href="/privacy-policy" className="text-primary font-medium hover:underline">
            Kebijakan Privasi Glim
          </Link>
          . Di dalamnya dijelaskan secara terperinci mengenai dasar hukum pemrosesan, hak subjek
          data kamu, dan tata cara pelaksanaan hak-hak tersebut sesuai UU PDP No. 27 Tahun 2022.
        </p>
      </Section>

      <Section title="8. Perubahan Kebijakan Cookie">
        <p>
          Kami dapat memperbarui Kebijakan Cookie ini dari waktu ke waktu untuk menyesuaikan dengan
          perkembangan teknis layanan atau peraturan perundang-undangan baru. Versi terbaru akan
          selalu tersedia di halaman ini dengan tanggal pembaruan yang tercantum di bagian atas.
        </p>
      </Section>

      <Section title="9. Hubungi Kami">
        <p>
          Jika kamu memiliki pertanyaan atau masukan mengenai Kebijakan Cookie dan praktik privasi
          kami, silakan hubungi Tim Kepatuhan Privasi kami di:
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
