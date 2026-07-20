import {
  ArrowRight,
  Bell,
  Briefcase,
  Check,
  ClipboardList,
  Coffee,
  MessageSquare,
  ShieldCheck,
  Smile,
  Sparkles,
  Zap,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { FaqAccordion } from "@/components/landing/faq-accordion"
import { faqs } from "@/components/landing/faq-data"
import { WaMockup } from "@/components/landing/wa-mockup"
import { Logo } from "@/components/logo"

const pageTitle = "Glim — AI Assistant WhatsApp untuk Bisnis Indonesia"
const pageDescription =
  "Balas pesan pelanggan dengan gaya bicaramu sendiri. Pengingat pembayaran otomatis. Kelola pesanan dalam satu tempat. Khusus untuk bisnis jasa Indonesia."

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/",
    siteName: "Glim",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
  alternates: {
    canonical: "/",
  },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
}

// Static page — logged-in users are redirected to /dashboard by proxy.ts
export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F8F6F2", color: "#1A1A18" }}
    >
      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ backgroundColor: "rgba(248,246,242,0.92)", borderColor: "#E8E4DC" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo variant="lockup" tone="light" height={22} />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:text-[#1A1A18]"
              style={{ color: "#6B6862" }}
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#703c8b]"
              style={{ backgroundColor: "#703c8b", color: "#fff" }}
            >
              Daftar Gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        style={{ backgroundColor: "#F8F6F2" }}
        className="relative overflow-hidden pt-16 pb-24 px-4 sm:px-6"
      >
        {/* Batik parang texture — very faint, ambient only */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><g fill='none' stroke='#DDD5C7' stroke-width='1.4' stroke-linecap='round'><path d='M8 20c6-8 14-8 20 0'/><path d='M4 44c6-8 14-8 20 0'/><path d='M32 48c6-8 14-8 20 0'/><path d='M36 12c6-8 14-8 20 0'/></g></svg>`,
            )}")`,
            backgroundSize: "56px 56px",
            opacity: 0.28,
          }}
        />
        {/* Ambient gradient glow — aubergine + gold, replaces photography as the hero's depth cue */}
        <div
          aria-hidden="true"
          className="animate-hero-glow absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full pointer-events-none blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(232,163,61,0.30) 0%, rgba(232,163,61,0) 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="animate-hero-glow absolute top-1/3 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(112,60,139,0.22) 0%, rgba(112,60,139,0) 70%)",
            animationDelay: "-6s",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(248,246,242,0.15) 0%, rgba(248,246,242,0.6) 60%, #F8F6F2 100%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[1fr_1.15fr] gap-10 md:gap-8 items-center">
            {/* Left — copy */}
            <div className="animate-fade-up">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full mb-6"
                style={{ backgroundColor: "#EDE0F5", color: "#4a2560" }}
              >
                <Sparkles className="w-3 h-3" />
                AI untuk bisnis jasa Indonesia
              </span>

              <h1
                className="font-display font-bold text-4xl sm:text-5xl leading-[1.1] tracking-tight mb-5"
                style={{ color: "#1A1A18" }}
              >
                Biar AI yang jaga <span style={{ color: "#703c8b" }}>WhatsApp kamu,</span> kamu
                fokus jaga kualitas kerja.
              </h1>

              <p
                className="text-base leading-relaxed mb-8"
                style={{ color: "#6B6862", maxWidth: "420px" }}
              >
                Glim membalas pesan pelanggan dengan gaya bicara bisnismu sendiri, ingatkan jadwal
                dan pembayaran otomatis — supaya kamu nggak perlu standby HP 24 jam.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#703c8b]"
                  style={{ backgroundColor: "#703c8b", color: "#fff" }}
                >
                  Coba Gratis 14 Hari
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#cara-kerja"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium px-6 py-3 rounded-xl border transition-colors hover:bg-white"
                  style={{
                    borderColor: "#C9C3BB",
                    color: "#1A1A18",
                    backgroundColor: "transparent",
                  }}
                >
                  Lihat cara kerja
                </Link>
              </div>
              <p className="text-xs mt-3" style={{ color: "#9B9590" }}>
                Tidak perlu kartu kredit
              </p>
            </div>

            {/* Right — WA mockup, enlarged as the hero's centerpiece */}
            <div
              className="relative flex justify-center md:justify-end animate-fade-up scroll-reveal-scale"
              style={{ animationDelay: "0.15s" }}
            >
              {/* Glow ring behind the mockup — depth without photography */}
              <div
                aria-hidden="true"
                className="absolute rounded-full blur-3xl pointer-events-none"
                style={{
                  inset: "-10%",
                  background:
                    "radial-gradient(circle, rgba(232,163,61,0.28) 0%, rgba(112,60,139,0.22) 55%, transparent 75%)",
                }}
              />
              <div className="relative z-10 w-full" style={{ maxWidth: "400px" }}>
                <WaMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="py-16 px-4 sm:px-6 bg-white scroll-reveal-up">
        <div className="max-w-2xl mx-auto text-center">
          <span
            className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: "#FDF3E7", color: "#B8720A" }}
          >
            Masalah yang kamu kenal
          </span>
          <h2
            className="font-display font-bold text-3xl sm:text-4xl leading-tight tracking-tight mb-6"
            style={{ color: "#1A1A18" }}
          >
            Satu admin sakit,
            <br />
            satu hari penuh kacau.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "#6B6862" }}>
            Pelanggan nanya harga, nanya jadwal fitting, nagih DP yang belum dibayar — semua lewat
            WhatsApp, semua butuh dibalas cepat. Kalau orang yang pegang HP bisnis lagi cuti atau
            sakit, semua menumpuk. Pelanggan nunggu, kamu yang dikomplain.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 sm:px-6" style={{ backgroundColor: "#F8F6F2" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "#EDE0F5", color: "#4a2560" }}
            >
              Yang Glim kerjakan
            </span>
            <h2
              className="font-display font-bold text-3xl sm:text-4xl tracking-tight"
              style={{ color: "#1A1A18" }}
            >
              Satu platform, semua terhandle.
            </h2>
          </div>

          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
            {/* Hero feature — the one that makes Glim not-generic, given room to breathe */}
            <div
              className="rounded-2xl p-8 sm:p-10 border scroll-reveal-up flex flex-col justify-between"
              style={{ backgroundColor: "#EDE0F5", borderColor: "#DCC5EA" }}
            >
              <div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: "#fff" }}
                >
                  <MessageSquare className="w-6 h-6" style={{ color: "#703c8b" }} />
                </div>
                <h3
                  className="font-display font-semibold text-xl sm:text-2xl mb-3 leading-snug"
                  style={{ color: "#1A1A18" }}
                >
                  Balas dengan gaya bicaramu sendiri
                </h3>
                <p
                  className="text-sm sm:text-base leading-relaxed mb-6"
                  style={{ color: "#4a2560" }}
                >
                  Upload riwayat chat kamu, AI belajar cara kamu biasa menyapa, menjawab harga, dan
                  bicara ke pelanggan. Bukan jawaban template — jawaban yang terasa seperti kamu
                  yang ketik sendiri.
                </p>
              </div>
              {/* Decorative accent only — no new copy, echoes the tone-preset icons from Settings */}
              <div className="flex items-center gap-2" aria-hidden="true">
                {[Smile, Briefcase, Coffee].map((Icon, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "#703c8b" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Two supporting features, stacked */}
            <div className="grid gap-5">
              {[
                {
                  icon: <Bell className="w-5 h-5" style={{ color: "#B8720A" }} />,
                  iconBg: "#FDF3E7",
                  title: "Pengingat otomatis, tanpa kamu ingat-ingat",
                  body: "DP belum lunas? Jadwal fitting besok? Glim kirim pengingat WhatsApp otomatis ke pelanggan, sesuai jadwal yang kamu atur.",
                },
                {
                  icon: <ShieldCheck className="w-5 h-5" style={{ color: "#1A7A4A" }} />,
                  iconBg: "#E6F4ED",
                  title: "Kamu tetap pegang kendali",
                  body: "Setiap balasan AI bisa kamu review dulu sebelum terkirim. Pesan rumit atau komplain otomatis dialihkan ke kamu.",
                },
              ].map((feat, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-6 border scroll-reveal-up flex-1"
                  style={{ backgroundColor: "#fff", borderColor: "#E8E4DC" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: feat.iconBg }}
                  >
                    {feat.icon}
                  </div>
                  <h3
                    className="font-display font-semibold text-base mb-2 leading-snug"
                    style={{ color: "#1A1A18" }}
                  >
                    {feat.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B6862" }}>
                    {feat.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="cara-kerja" className="scroll-mt-16 py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "#EDE0F5", color: "#4a2560" }}
            >
              Cara kerja
            </span>
            <h2
              className="font-display font-bold text-3xl sm:text-4xl tracking-tight"
              style={{ color: "#1A1A18" }}
            >
              Setup 10 menit, langsung jalan.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: "01",
                icon: <Zap className="w-4 h-4" />,
                title: "Hubungkan WhatsApp bisnis kamu",
                body: "Scan QR sekali, nomor WA kamu langsung terhubung.",
              },
              {
                num: "02",
                icon: <MessageSquare className="w-4 h-4" />,
                title: "Ceritakan bisnismu",
                body: "Upload chat lama atau ceritakan produk dan harga kamu — AI langsung paham konteks bisnismu.",
              },
              {
                num: "03",
                icon: <ClipboardList className="w-4 h-4" />,
                title: "Tambah klien dan jadwal",
                body: "Catat klien, pesanan, dan jadwal pembayaran dalam satu tempat.",
              },
              {
                num: "04",
                icon: <Sparkles className="w-4 h-4" />,
                title: "AI mulai bantu balas",
                body: "Setiap pesan masuk, AI siapkan draft balasan. Kamu review, kamu kirim.",
              },
            ].map((step, i) => (
              <div key={i} className="scroll-reveal-up">
                <div
                  className="font-display font-bold text-4xl mb-4 tabular-nums"
                  style={{ color: "#E8E4DC" }}
                >
                  {step.num}
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: "#EDE0F5", color: "#703c8b" }}
                >
                  {step.icon}
                </div>
                <h3
                  className="font-display font-semibold text-sm mb-1.5 leading-snug"
                  style={{ color: "#1A1A18" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B6862" }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        className="relative overflow-hidden py-24 px-4 sm:px-6"
        style={{ backgroundColor: "#F8F6F2" }}
      >
        {/* Ambient glow behind the price — same signature as hero, ties the page together */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full pointer-events-none blur-3xl"
          style={{
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(112,60,139,0.16) 0%, rgba(232,163,61,0.14) 55%, transparent 75%)",
          }}
        />
        <div className="relative max-w-md mx-auto">
          <div className="text-center mb-8">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "#EDE0F5", color: "#4a2560" }}
            >
              Harga jelas, tanpa kejutan
            </span>
            <h2
              className="font-display font-bold text-3xl tracking-tight"
              style={{ color: "#1A1A18" }}
            >
              Satu paket, semua fitur.
            </h2>
          </div>

          <div
            className="rounded-2xl border-2 p-8 sm:p-10 shadow-xl scroll-reveal-up"
            style={{ backgroundColor: "#fff", borderColor: "#703c8b" }}
          >
            <p
              className="font-display font-bold text-sm mb-1 text-center"
              style={{ color: "#703c8b" }}
            >
              Glim
            </p>
            <div className="flex items-end justify-center gap-1 mb-1">
              <span
                className="font-bold text-5xl tabular-nums tracking-tight"
                style={{ fontFamily: "ui-monospace, monospace", color: "#1A1A18" }}
              >
                Rp 299.000
              </span>
            </div>
            <p className="text-sm mb-8 text-center" style={{ color: "#9B9590" }}>
              per bulan · coba gratis 14 hari
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-8">
              {[
                "Nomor WhatsApp bisnis terhubung",
                "AI belajar gaya bicara dari chat kamu",
                "Pengingat pembayaran & jadwal otomatis",
                "Inbox terpusat untuk semua percakapan",
                "Import data klien dari Excel",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: "#1A1A18" }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "#EDE0F5" }}
                  >
                    <Check className="w-2.5 h-2.5" style={{ color: "#703c8b" }} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="block w-full text-center text-sm font-semibold px-6 py-3.5 rounded-xl transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#703c8b]"
              style={{ backgroundColor: "#703c8b", color: "#fff" }}
            >
              Mulai Trial 14 Hari
            </Link>
            <p className="text-center text-xs mt-3" style={{ color: "#9B9590" }}>
              Tidak perlu kartu kredit · Cancel kapan saja
            </p>
          </div>
        </div>
      </section>

      {/* ── Why we built this ── */}
      <section
        className="relative overflow-hidden py-24 px-4 sm:px-6 scroll-reveal-up"
        style={{ backgroundColor: "#2D1445" }}
      >
        {/* Atelier photo — kebaya fitting on a dress form, tinted to the brand aubergine */}
        <img
          src="/landing/atelier.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(45,20,69,0.82) 0%, rgba(74,37,96,0.6) 55%, rgba(45,20,69,0.8) 100%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <span
            className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-6"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          >
            Kenapa Glim ada
          </span>
          <h2
            className="font-display font-bold text-3xl sm:text-4xl leading-tight tracking-tight mb-6"
            style={{ color: "#fff" }}
          >
            Dibangun dari masalah nyata pemilik bisnis jasa.
          </h2>
          <p
            className="text-base leading-relaxed mx-auto"
            style={{ color: "rgba(255,255,255,0.7)", maxWidth: "520px" }}
          >
            Glim lahir dari obrolan dengan pemilik bisnis fashion custom yang setiap kali admin-nya
            cuti, pesanan jadi berantakan — pelanggan nanya berkali-kali, jadwal fitting kelewat,
            pembayaran lupa ditagih. Kami percaya bisnis jasa Indonesia butuh alat yang ngerti cara
            kerja mereka — bukan software generic yang dipaksa cocok.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 sm:px-6 bg-white scroll-reveal-up">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "#F8F6F2", color: "#6B6862", border: "1px solid #E8E4DC" }}
            >
              FAQ
            </span>
            <h2
              className="font-display font-bold text-3xl tracking-tight"
              style={{ color: "#1A1A18" }}
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
        className="py-24 px-4 sm:px-6 scroll-reveal-up"
        style={{ background: "linear-gradient(135deg, #4a2560 0%, #703c8b 50%, #8b5aa3 100%)" }}
      >
        <div className="max-w-xl mx-auto text-center">
          <h2
            className="font-display font-bold text-3xl sm:text-4xl leading-tight tracking-tight mb-4"
            style={{ color: "#fff" }}
          >
            Mulai bantu admin kamu hari ini.
          </h2>
          <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.75)" }}>
            14 hari gratis. Tanpa kartu kredit. Setup 10 menit.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm font-semibold px-8 py-4 rounded-xl transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
            style={{ backgroundColor: "#E8A33D", color: "#1A1A18" }}
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
