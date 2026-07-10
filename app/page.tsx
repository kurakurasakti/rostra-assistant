import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Footer } from '@/components/footer'
import { FaqAccordion } from '@/components/landing/faq-accordion'
import { PricingSection } from '@/components/landing/pricing-section'
import { faqs } from '@/components/landing/faq-data'
import {
  MessageSquare,
  Bell,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ClipboardList,
  Zap,
} from 'lucide-react'

const pageTitle = 'Glim — AI Assistant WhatsApp untuk Bisnis Indonesia'
const pageDescription =
  'Balas pesan pelanggan dengan gaya bicaramu sendiri. Pengingat pembayaran otomatis. Kelola pesanan dalam satu tempat. Khusus untuk bisnis jasa Indonesia.'

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: '/',
    siteName: 'Glim',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
  },
  alternates: {
    canonical: '/',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

// Static page — logged-in users are redirected to /dashboard by proxy.ts
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F6F2', color: '#1A1A18' }}>
      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ backgroundColor: 'rgba(248,246,242,0.92)', borderColor: '#E8E4DC' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo variant="lockup" tone="light" height={22} />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:text-[#1A1A18]"
              style={{ color: '#6B6862' }}
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#703c8b]"
              style={{ backgroundColor: '#703c8b', color: '#fff' }}
            >
              Daftar Gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ backgroundColor: '#F8F6F2' }} className="pt-16 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Left — copy */}
            <div className="animate-fade-up">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-6"
                style={{ backgroundColor: '#EDE0F5', color: '#4a2560' }}
              >
                <Sparkles className="w-3 h-3" />
                AI untuk bisnis jasa Indonesia
              </span>

              <h1
                className="font-display font-bold text-4xl sm:text-5xl leading-[1.1] tracking-tight mb-5"
                style={{ color: '#1A1A18' }}
              >
                Biar AI yang jaga{' '}
                <span style={{ color: '#703c8b' }}>WhatsApp kamu,</span>{' '}
                kamu fokus jaga kualitas kerja.
              </h1>

              <p className="text-base leading-relaxed mb-8" style={{ color: '#6B6862', maxWidth: '420px' }}>
                Glim membalas pesan pelanggan dengan gaya bicara bisnismu sendiri, ingatkan jadwal
                dan pembayaran otomatis — supaya kamu nggak perlu standby HP 24 jam.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#703c8b]"
                  style={{ backgroundColor: '#703c8b', color: '#fff' }}
                >
                  Coba Gratis 14 Hari
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#cara-kerja"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium px-6 py-3 rounded-xl border transition-colors hover:bg-white"
                  style={{ borderColor: '#C9C3BB', color: '#1A1A18', backgroundColor: 'transparent' }}
                >
                  Lihat cara kerja
                </Link>
              </div>
              <p className="text-xs mt-3" style={{ color: '#9B9590' }}>
                Tidak perlu kartu kredit
              </p>
            </div>

            {/* Right — WA mockup */}
            <div className="flex justify-center animate-fade-up" style={{ animationDelay: '0.15s' }}>
              <WaMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <span
            className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: '#FDF3E7', color: '#B8720A' }}
          >
            Masalah yang kamu kenal
          </span>
          <h2
            className="font-display font-bold text-3xl sm:text-4xl leading-tight tracking-tight mb-6"
            style={{ color: '#1A1A18' }}
          >
            Satu admin sakit,<br />satu hari penuh kacau.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: '#6B6862' }}>
            Pelanggan nanya harga, nanya jadwal fitting, nagih DP yang belum dibayar — semua lewat
            WhatsApp, semua butuh dibalas cepat. Kalau orang yang pegang HP bisnis lagi cuti atau
            sakit, semua menumpuk. Pelanggan nunggu, kamu yang dikomplain.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: '#F8F6F2' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: '#EDE0F5', color: '#4a2560' }}
            >
              Yang Glim kerjakan
            </span>
            <h2
              className="font-display font-bold text-3xl sm:text-4xl tracking-tight"
              style={{ color: '#1A1A18' }}
            >
              Satu platform, semua terhandle.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: <MessageSquare className="w-5 h-5" style={{ color: '#703c8b' }} />,
                iconBg: '#EDE0F5',
                title: 'Balas dengan gaya bicaramu sendiri',
                body: 'Upload riwayat chat kamu, AI belajar cara kamu biasa menyapa, menjawab harga, dan bicara ke pelanggan. Bukan jawaban template — jawaban yang terasa seperti kamu yang ketik sendiri.',
              },
              {
                icon: <Bell className="w-5 h-5" style={{ color: '#B8720A' }} />,
                iconBg: '#FDF3E7',
                title: 'Pengingat otomatis, tanpa kamu ingat-ingat',
                body: 'DP belum lunas? Jadwal fitting besok? Glim kirim pengingat WhatsApp otomatis ke pelanggan, sesuai jadwal yang kamu atur. Kamu nggak perlu buka catatan manual lagi.',
              },
              {
                icon: <ShieldCheck className="w-5 h-5" style={{ color: '#1A7A4A' }} />,
                iconBg: '#E6F4ED',
                title: 'Kamu tetap pegang kendali',
                body: 'Setiap balasan AI bisa kamu review dulu sebelum terkirim. Pesan rumit atau komplain otomatis dialihkan ke kamu — AI tahu kapan harus minta bantuan manusia.',
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 border"
                style={{ backgroundColor: '#fff', borderColor: '#E8E4DC' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: feat.iconBg }}
                >
                  {feat.icon}
                </div>
                <h3
                  className="font-display font-semibold text-base mb-2 leading-snug"
                  style={{ color: '#1A1A18' }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B6862' }}>
                  {feat.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="cara-kerja" className="scroll-mt-16 py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: '#EDE0F5', color: '#4a2560' }}
            >
              Cara kerja
            </span>
            <h2
              className="font-display font-bold text-3xl sm:text-4xl tracking-tight"
              style={{ color: '#1A1A18' }}
            >
              Setup 10 menit, langsung jalan.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '01',
                icon: <Zap className="w-4 h-4" />,
                title: 'Hubungkan WhatsApp bisnis kamu',
                body: 'Scan QR sekali, nomor WA kamu langsung terhubung.',
              },
              {
                num: '02',
                icon: <MessageSquare className="w-4 h-4" />,
                title: 'Ceritakan bisnismu',
                body: 'Upload chat lama atau ceritakan produk dan harga kamu — AI langsung paham konteks bisnismu.',
              },
              {
                num: '03',
                icon: <ClipboardList className="w-4 h-4" />,
                title: 'Tambah klien dan jadwal',
                body: 'Catat klien, pesanan, dan jadwal pembayaran dalam satu tempat.',
              },
              {
                num: '04',
                icon: <Sparkles className="w-4 h-4" />,
                title: 'AI mulai bantu balas',
                body: 'Setiap pesan masuk, AI siapkan draft balasan. Kamu review, kamu kirim.',
              },
            ].map((step, i) => (
              <div key={i}>
                <div
                  className="font-display font-bold text-4xl mb-4 tabular-nums"
                  style={{ color: '#E8E4DC' }}
                >
                  {step.num}
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: '#EDE0F5', color: '#703c8b' }}
                >
                  {step.icon}
                </div>
                <h3
                  className="font-display font-semibold text-sm mb-1.5 leading-snug"
                  style={{ color: '#1A1A18' }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B6862' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── Why we built this ── */}
      <section
        className="py-20 px-4 sm:px-6"
        style={{ background: 'linear-gradient(135deg, #2D1445 0%, #4a2560 60%, #5c3070 100%)' }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <span
            className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-6"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            Kenapa Glim ada
          </span>
          <h2
            className="font-display font-bold text-3xl sm:text-4xl leading-tight tracking-tight mb-6"
            style={{ color: '#fff' }}
          >
            Dibangun dari masalah nyata pemilik bisnis jasa.
          </h2>
          <p
            className="text-base leading-relaxed mx-auto"
            style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '520px' }}
          >
            Glim lahir dari obrolan dengan pemilik bisnis fashion custom yang setiap kali admin-nya
            cuti, pesanan jadi berantakan — pelanggan nanya berkali-kali, jadwal fitting kelewat,
            pembayaran lupa ditagih. Kami percaya bisnis jasa Indonesia butuh alat yang ngerti cara
            kerja mereka — bukan software generic yang dipaksa cocok.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: '#F8F6F2', color: '#6B6862', border: '1px solid #E8E4DC' }}
            >
              FAQ
            </span>
            <h2
              className="font-display font-bold text-3xl tracking-tight"
              style={{ color: '#1A1A18' }}
            >
              Pertanyaan yang sering ditanya.
            </h2>
          </div>
          <FaqAccordion />
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </section>

      {/* ── Final CTA ── */}
      <section
        className="py-20 px-4 sm:px-6"
        style={{ background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 50%, #8b5aa3 100%)' }}
      >
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="font-display font-bold text-3xl sm:text-4xl leading-tight tracking-tight mb-4"
            style={{ color: '#fff' }}
          >
            Mulai bantu admin kamu hari ini.
          </h2>
          <p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
            14 hari gratis. Tanpa kartu kredit. Setup 10 menit.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm font-semibold px-8 py-4 rounded-xl transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
            style={{ backgroundColor: '#E8A33D', color: '#1A1A18' }}
          >
            Coba Glim Sekarang
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function WaMockup() {
  return (
    // Decorative product mockup — hidden from assistive tech, no focusable controls inside
    <div
      aria-hidden="true"
      className="rounded-2xl shadow-xl overflow-hidden border w-full"
      style={{ maxWidth: '340px', borderColor: '#E8E4DC', backgroundColor: '#ECE5DD' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 100%)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <span className="text-white font-bold text-xs">R</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-xs truncate">Rina Sari</p>
          <p className="text-white/60 text-[10px]">0812-3456-7890</p>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
        >
          Inbox Glim
        </span>
      </div>

      {/* Chat area */}
      <div className="p-3 space-y-2 min-h-[200px]">
        {/* Incoming message 1 */}
        <div
          className="animate-chat-bubble-1 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]"
          style={{ backgroundColor: '#fff' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: '#1A1A18' }}>
            Halo kak, mau tanya soal kebaya custom dong, ada nggak? 🙏
          </p>
          <p className="text-right text-[10px] mt-1" style={{ color: '#9B9590' }}>
            11:23
          </p>
        </div>

        {/* Incoming message 2 */}
        <div
          className="animate-chat-bubble-2 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]"
          style={{ backgroundColor: '#fff' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: '#1A1A18' }}>
            Berapa harga mulai dari untuk size M?
          </p>
          <p className="text-right text-[10px] mt-1" style={{ color: '#9B9590' }}>
            11:24
          </p>
        </div>

        {/* AI draft card */}
        <div
          className="animate-ai-draft rounded-xl border-2 p-3 mt-3"
          style={{ backgroundColor: '#FFFBF3', borderColor: '#E8A33D' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles
              className="animate-amber-pulse w-3 h-3"
              style={{ color: '#E8A33D' }}
            />
            <span className="text-[10px] font-semibold" style={{ color: '#B8720A' }}>
              Draft AI
            </span>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#1A1A18' }}>
            Halo Rina! Ada kok kak 😊 Kebaya custom kami mulai dari{' '}
            <span className="font-medium">Rp 850.000</span> untuk size M. Bisa konsultasi gratis
            dulu soal desain dan bahan...
          </p>
          <div className="flex gap-2">
            <div
              className="flex-1 text-center text-[10px] font-medium py-1.5 rounded-lg border"
              style={{ borderColor: '#C9C3BB', color: '#6B6862', backgroundColor: 'transparent' }}
            >
              Ubah
            </div>
            <div
              className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg"
              style={{ backgroundColor: '#703c8b', color: '#fff' }}
            >
              ✓ Kirim
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
