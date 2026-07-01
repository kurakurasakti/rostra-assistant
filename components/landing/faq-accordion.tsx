'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'Apakah pelanggan tahu mereka chat dengan AI?',
    a: 'Itu tergantung kamu. Banyak pemilik bisnis memilih review setiap balasan dulu sebelum kirim, jadi tetap terasa personal.',
  },
  {
    q: 'Bagaimana kalau pelanggan tanya hal yang AI tidak tahu?',
    a: 'AI akan bilang akan tanya ke tim dulu, dan pesan itu masuk ke kamu untuk dijawab manual.',
  },
  {
    q: 'Apakah saya perlu nomor WhatsApp baru?',
    a: 'Disarankan pakai nomor khusus bisnis, bukan nomor pribadi, supaya lebih aman dan terorganisir.',
  },
  {
    q: 'Bisa cancel kapan saja?',
    a: 'Bisa. Tidak ada kontrak jangka panjang.',
  },
  {
    q: 'Data pelanggan saya aman?',
    a: 'Ya, percakapan dan data klien tersimpan aman dan tidak dibagikan ke pihak ketiga.',
  },
]

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div key={i} className="border border-[#E8E4DC] rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F8F6F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#703c8b] focus-visible:ring-inset"
            aria-expanded={open === i}
          >
            <span className="font-medium text-[#1A1A18] text-sm leading-snug pr-4">{faq.q}</span>
            <ChevronDown
              className={`w-4 h-4 text-[#6B6862] transition-transform duration-200 flex-shrink-0 ${open === i ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {open === i && (
            <div className="px-5 pb-4 pt-3 text-sm text-[#6B6862] leading-relaxed border-t border-[#E8E4DC]">
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
