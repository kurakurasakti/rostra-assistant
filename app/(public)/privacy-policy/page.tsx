import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — Rostra',
}

export default function PrivacyPolicyPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@rostra.id'
  const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <article className="prose prose-sm prose-gray max-w-none">
      <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Kebijakan Privasi</h1>
      <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: {today}</p>

      <Section title="1. Pendahuluan">
        <p>
          Rostra adalah platform manajemen bisnis berbasis WhatsApp untuk UMKM Indonesia.
          Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data kamu.
        </p>
      </Section>

      <Section title="2. Data yang Kami Kumpulkan">
        <ul>
          <li><strong>Informasi akun:</strong> nama bisnis, email</li>
          <li><strong>Data bisnis:</strong> produk, jam operasional, template pesan</li>
          <li><strong>Percakapan WhatsApp:</strong> pesan masuk dan keluar yang diproses melalui platform Rostra</li>
          <li><strong>Data klien:</strong> nama, nomor WhatsApp klien bisnis kamu</li>
          <li><strong>Data pesanan:</strong> informasi pesanan, jadwal, pembayaran</li>
        </ul>
      </Section>

      <Section title="3. Bagaimana Kami Menggunakan Data">
        <ul>
          <li>Menjalankan fitur platform Rostra</li>
          <li>Menghasilkan draft balasan AI berdasarkan konteks bisnis</li>
          <li>Mengirim pengingat otomatis ke klien kamu</li>
          <li>Meningkatkan akurasi AI dari koreksi yang kamu berikan</li>
        </ul>
      </Section>

      <Section title="4. Penyimpanan dan Keamanan Data">
        <ul>
          <li>Data disimpan di server Supabase (infrastruktur aman)</li>
          <li>Percakapan WhatsApp disimpan maksimal 90 hari</li>
          <li>Media (foto, dokumen) disimpan maksimal 90 hari</li>
          <li>Kami tidak menjual data kamu ke pihak ketiga</li>
        </ul>
      </Section>

      <Section title="5. Layanan Pihak Ketiga">
        <ul>
          <li><strong>Supabase:</strong> penyimpanan database</li>
          <li><strong>DeepSeek AI:</strong> pemrosesan teks untuk draft balasan (pesan dikirim ke API DeepSeek untuk diproses)</li>
          <li><strong>Baileys:</strong> koneksi WhatsApp</li>
        </ul>
      </Section>

      <Section title="6. Hak Kamu">
        <p>Sesuai UU PDP Indonesia, kamu berhak:</p>
        <ul>
          <li>Mengakses data yang kami simpan tentang kamu</li>
          <li>Meminta koreksi data yang tidak akurat</li>
          <li>Meminta penghapusan akun dan seluruh data kamu</li>
        </ul>
        <p>
          Untuk permintaan penghapusan data, kirim email ke:{' '}
          <a href={`mailto:${email}`} className="text-primary font-medium">{email}</a>
        </p>
      </Section>

      <Section title="7. Perubahan Kebijakan">
        <p>
          Kami akan memberitahu perubahan kebijakan melalui email atau notifikasi di platform.
        </p>
      </Section>

      <Section title="8. Kontak">
        <p>
          Pertanyaan tentang privasi:{' '}
          <a href={`mailto:${email}`} className="text-primary font-medium">{email}</a>
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
