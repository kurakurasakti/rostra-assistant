import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Footer } from '@/components/footer'
import { FaqAccordion } from '@/components/landing/faq-accordion'
import { faqs } from '@/components/landing/faq-data'
import { WaMockup } from '@/components/landing/wa-mockup'
import {
  MessageSquare,
  Bell,
  ShieldCheck,
  ArrowRight,
  Check,
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
      <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: '#F8F6F2' }}>
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: '#EDE0F5', color: '#4a2560' }}
            >
              Harga jelas, tanpa kejutan
            </span>
            <h2
              className="font-display font-bold text-3xl tracking-tight"
              style={{ color: '#1A1A18' }}
            >
              Satu paket, semua fitur.
            </h2>
          </div>

          <div
            className="rounded-2xl border-2 p-8 shadow-lg"
            style={{ backgroundColor: '#fff', borderColor: '#703c8b' }}
          >
            <p className="font-display font-bold text-sm mb-1" style={{ color: '#703c8b' }}>
              Glim
            </p>
            <div className="flex items-end gap-1 mb-1">
              <span
                className="font-bold text-4xl tabular-nums tracking-tight"
                style={{ fontFamily: 'ui-monospace, monospace', color: '#1A1A18' }}
              >
                Rp 299.000
              </span>
            </div>
            <p className="text-sm mb-6" style={{ color: '#9B9590' }}>
              per bulan · coba gratis 14 hari
            </p>

            <ul className="space-y-2.5 mb-8">
              {[
                'Nomor WhatsApp bisnis terhubung',
                'AI belajar gaya bicara dari chat kamu',
                'Pengingat pembayaran & jadwal otomatis',
                'Inbox terpusat untuk semua percakapan',
                'Import data klien dari Excel',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: '#1A1A18' }}>
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#EDE0F5' }}
                  >
                    <Check className="w-2.5 h-2.5" style={{ color: '#703c8b' }} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="block w-full text-center text-sm font-semibold px-6 py-3.5 rounded-xl transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#703c8b]"
              style={{ backgroundColor: '#703c8b', color: '#fff' }}
            >
              Mulai Trial 14 Hari
            </Link>
            <p className="text-center text-xs mt-3" style={{ color: '#9B9590' }}>
              Tidak perlu kartu kredit · Cancel kapan saja
            </p>
          </div>
        </div>
      </section>

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
