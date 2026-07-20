import { Mail, MessageSquare } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tentang — Glim",
}

export default function AboutPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@glim.id"
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Glim"

  return (
    <article className="prose prose-sm prose-gray max-w-none">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight mb-0">Tentang {company}</h1>
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-6">
        Platform manajemen pesan WhatsApp berbasis AI khusus untuk bisnis UMKM Indonesia. Dirancang
        untuk bisnis fashion, tailor, bakery, fotografer, dan jasa lainnya yang komunikasi utamanya
        via WA.
      </p>

      <p className="text-sm text-gray-600 leading-relaxed mb-6">
        Admin bisnis menghabiskan banyak waktu membalas pesan yang berulang. {company} membantu
        dengan draft balasan AI, pengingat pembayaran otomatis, dan manajemen pesanan terpusat.
      </p>

      <p className="text-sm text-gray-600 leading-relaxed mb-8">
        Dibuat oleh developer Indonesia untuk bisnis Indonesia. AI dilatih memahami gaya komunikasi
        Bahasa Indonesia yang natural.
      </p>

      <div className="border-t border-gray-100 pt-6 space-y-3">
        <h2 className="font-display font-semibold text-sm tracking-tight">Kontak</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <a href={`mailto:${email}`} className="text-primary font-medium hover:underline">
            {email}
          </a>
        </div>
      </div>
    </article>
  )
}
