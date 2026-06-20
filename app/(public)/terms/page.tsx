import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — Glim',
}

export default function TermsPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@glim.id'
  const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <article className="prose prose-sm prose-gray max-w-none">
      <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Syarat & Ketentuan</h1>
      <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: {today}</p>

      <Section title="1. Penerimaan Syarat">
        <p>Dengan menggunakan Glim, kamu menyetujui syarat dan ketentuan ini.</p>
      </Section>

      <Section title="2. Layanan Glim">
        <p>
          Glim menyediakan platform manajemen pesan WhatsApp berbasis AI untuk bisnis UMKM Indonesia.
          Layanan mencakup inbox terpusat, reminder otomatis, dan draft balasan AI.
        </p>
      </Section>

      <Section title="3. Akun dan Tanggung Jawab Pengguna">
        <ul>
          <li>Kamu bertanggung jawab atas keamanan akun</li>
          <li>Kamu bertanggung jawab atas konten yang dikirim melalui platform ke klien kamu</li>
          <li>Kamu tidak boleh menggunakan Glim untuk spam, penipuan, atau aktivitas ilegal</li>
          <li>Satu akun untuk satu bisnis</li>
        </ul>
      </Section>

      <Section title="4. WhatsApp dan Kebijakan Meta">
        <p>
          Glim menggunakan koneksi WhatsApp tidak resmi. Kami tidak bertanggung jawab jika nomor WhatsApp
          kamu diblokir oleh Meta/WhatsApp karena penggunaan yang melanggar kebijakan WhatsApp.
          Kami menyarankan menggunakan nomor bisnis khusus, bukan nomor pribadi.
        </p>
      </Section>

      <Section title="5. Data dan AI">
        <ul>
          <li>Percakapan klien kamu diproses oleh AI untuk menghasilkan draft balasan</li>
          <li>Kamu bertanggung jawab memastikan klien kamu mengetahui percakapan mereka diproses oleh sistem</li>
          <li>Glim tidak bertanggung jawab atas kesalahan draft AI yang dikirim tanpa review manual</li>
        </ul>
      </Section>

      <Section title="6. Pembayaran dan Langganan">
        <ul>
          <li>Biaya langganan Rp 299.000/bulan per akun</li>
          <li>Pembayaran non-refundable kecuali ada gangguan layanan dari pihak Glim</li>
          <li>Layanan dapat dihentikan jika pembayaran tidak dilakukan dalam 7 hari setelah jatuh tempo</li>
        </ul>
      </Section>

      <Section title="7. Batasan Tanggung Jawab">
        <p>
          Glim tidak bertanggung jawab atas kerugian bisnis yang timbul dari gangguan layanan,
          kesalahan AI, atau pemblokiran WhatsApp.
        </p>
      </Section>

      <Section title="8. Penghentian Layanan">
        <p>
          Kami berhak menghentikan akun yang melanggar ketentuan ini tanpa pemberitahuan sebelumnya.
        </p>
      </Section>

      <Section title="9. Perubahan Ketentuan">
        <p>
          Ketentuan dapat berubah. Pengguna akan diberitahu melalui email atau platform.
        </p>
      </Section>

      <Section title="10. Hukum yang Berlaku">
        <p>
          Ketentuan ini tunduk pada hukum Republik Indonesia.
        </p>
      </Section>

      <p className="text-sm text-gray-500 mt-8">
        Pertanyaan:{' '}
        <a href={`mailto:${email}`} className="text-primary font-medium">{email}</a>
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
