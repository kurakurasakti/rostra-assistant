'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

const gratisFeatures = [
  '1 nomor WhatsApp terhubung',
  '100 draft balasan AI per bulan',
  'Inbox terpusat untuk semua chat',
  'Sampai 20 klien aktif',
]

const proFeatures = [
  '2.000 draft balasan AI per bulan',
  'AI belajar gaya bicaramu dari riwayat chat',
  'Pengingat pembayaran & jadwal otomatis',
  'Klien & pesanan tanpa batas',
  'Import data klien dari Excel',
  'Pesan sensitif otomatis dialihkan ke kamu',
]

const bisnisFeatures = [
  'Beberapa nomor WA & admin dalam satu tim',
  'Limit balasan AI menyesuaikan kebutuhan',
  'Onboarding didampingi sampai jalan',
  'Dukungan prioritas',
]

export function PricingSection() {
  const [yearly, setYearly] = useState(true)

  return (
    <section id="harga" className="scroll-mt-16 py-20 px-4 sm:px-6" style={{ backgroundColor: '#F8F6F2' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span
            className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: '#EDE0F5', color: '#4a2560' }}
          >
            Harga jelas, tanpa kejutan
          </span>
          <h2
            className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-3"
            style={{ color: '#1A1A18' }}
          >
            Mulai gratis, naik paket kalau butuh.
          </h2>
          <p className="text-base" style={{ color: '#6B6862' }}>
            Semua harga sudah final — tidak ada biaya setup atau biaya tersembunyi.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div
            className="inline-flex items-center rounded-full border p-1"
            style={{ backgroundColor: '#fff', borderColor: '#E8E4DC' }}
          >
            <button
              type="button"
              aria-pressed={!yearly}
              onClick={() => setYearly(false)}
              className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#703c8b]"
              style={
                !yearly
                  ? { backgroundColor: '#1A1A18', color: '#fff' }
                  : { backgroundColor: 'transparent', color: '#6B6862' }
              }
            >
              Bulanan
            </button>
            <button
              type="button"
              aria-pressed={yearly}
              onClick={() => setYearly(true)}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#703c8b]"
              style={
                yearly
                  ? { backgroundColor: '#1A1A18', color: '#fff' }
                  : { backgroundColor: 'transparent', color: '#6B6862' }
              }
            >
              Tahunan
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#FDF3E7', color: '#B8720A' }}
              >
                hemat 2 bulan
              </span>
            </button>
          </div>
        </div>

        {/* Asymmetric grid: Pro panel + side rail */}
        <div className="grid lg:grid-cols-12 gap-5 items-stretch">
          {/* ── Pro — main panel ── */}
          <div
            className="relative overflow-hidden rounded-3xl p-8 sm:p-10 lg:col-span-7 flex flex-col"
            style={{ background: 'linear-gradient(150deg, #2D1445 0%, #4a2560 70%, #5c3070 100%)' }}
          >
            {/* Batik stitch texture — decorative */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'url(/landing/batik-parang.jpg)',
                backgroundSize: '480px',
                opacity: 0.35,
                mixBlendMode: 'luminosity',
              }}
            />

            <div className="relative flex flex-col flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="font-display font-bold text-xl" style={{ color: '#fff' }}>
                  Pro
                </p>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#E8A33D', color: '#1A1A18' }}
                >
                  Paling banyak dipilih
                </span>
              </div>

              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Buat bisnis yang WhatsApp-nya ramai tiap hari dan nggak mau ada chat kelewat.
              </p>

              <div className="flex items-end gap-2 mb-1">
                <span
                  className="font-bold text-4xl sm:text-5xl tabular-nums tracking-tight"
                  style={{ fontFamily: 'ui-monospace, monospace', color: '#fff' }}
                >
                  {yearly ? 'Rp 249.000' : 'Rp 299.000'}
                </span>
                <span className="text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  /bulan
                </span>
              </div>
              <p className="text-xs mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {yearly
                  ? 'Ditagih Rp 2.988.000 per tahun — hemat Rp 600.000 dibanding bulanan.'
                  : 'Ditagih tiap bulan. Pindah ke tahunan kapan saja.'}
              </p>

              <p
                className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: '#E8A33D' }}
              >
                Semua di Gratis, plus:
              </p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-8">
                {proFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: 'rgba(232,163,61,0.2)' }}
                    >
                      <Check className="w-2.5 h-2.5" style={{ color: '#E8A33D' }} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/register"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 text-sm font-semibold px-8 py-3.5 rounded-xl transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                  style={{ backgroundColor: '#E8A33D', color: '#1A1A18' }}
                >
                  Coba Pro Gratis 14 Hari
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Tidak perlu kartu kredit · Berhenti kapan saja · Setelah trial, kamu pilih sendiri lanjut atau turun ke Gratis
                </p>
              </div>
            </div>
          </div>

          {/* ── Side rail: Gratis + Bisnis ── */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Gratis */}
            <div
              className="rounded-2xl border p-6 flex-1"
              style={{ backgroundColor: '#fff', borderColor: '#E8E4DC' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-display font-bold text-base" style={{ color: '#1A1A18' }}>
                  Gratis
                </p>
                <span
                  className="font-bold text-xl tabular-nums"
                  style={{ fontFamily: 'ui-monospace, monospace', color: '#1A1A18' }}
                >
                  Rp 0
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: '#9B9590' }}>
                Buat coba dulu. Tanpa batas waktu, bukan trial.
              </p>
              <ul className="space-y-2 mb-5">
                {gratisFeatures.map((item) => (
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
                className="block w-full text-center text-sm font-medium px-6 py-2.5 rounded-xl border transition-colors hover:bg-[#F8F6F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#703c8b]"
                style={{ borderColor: '#C9C3BB', color: '#1A1A18' }}
              >
                Mulai Gratis
              </Link>
            </div>

            {/* Bisnis */}
            <div
              className="rounded-2xl border p-6 flex-1"
              style={{ backgroundColor: '#fff', borderColor: '#E8E4DC' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-display font-bold text-base" style={{ color: '#1A1A18' }}>
                  Bisnis
                </p>
                <span className="font-display font-semibold text-sm" style={{ color: '#6B6862' }}>
                  Harga menyesuaikan
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: '#9B9590' }}>
                Buat tim dengan beberapa admin atau lebih dari satu nomor WA.
              </p>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#703c8b' }}
              >
                Semua di Pro, plus:
              </p>
              <ul className="space-y-2 mb-5">
                {bisnisFeatures.map((item) => (
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
                href="/register?paket=bisnis"
                className="block w-full text-center text-sm font-medium px-6 py-2.5 rounded-xl border transition-colors hover:bg-[#F8F6F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#703c8b]"
                style={{ borderColor: '#C9C3BB', color: '#1A1A18' }}
              >
                Ngobrol dengan tim
              </Link>
              <p className="text-center text-[11px] mt-2" style={{ color: '#9B9590' }}>
                Daftar dulu, tim kami yang hubungi kamu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
