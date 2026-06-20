import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/footer'
import { Logo } from '@/components/logo'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Glim
          </Link>
          <Link href="/">
            <Logo variant="lockup" tone="light" height={20} />
          </Link>
        </div>
      </div>
      <main className="flex-1 px-4 py-10">
        <div className="max-w-[680px] mx-auto">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
