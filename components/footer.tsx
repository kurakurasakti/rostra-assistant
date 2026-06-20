import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Glim'

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>© {year} {company}</span>
          <nav className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-gray-700 transition-colors" target="_blank" rel="noopener noreferrer">Syarat & Ketentuan</Link>
            <span className="text-gray-300">·</span>
            <Link href="/privacy-policy" className="hover:text-gray-700 transition-colors" target="_blank" rel="noopener noreferrer">Kebijakan Privasi</Link>
            <span className="text-gray-300">·</span>
            <Link href="/about" className="hover:text-gray-700 transition-colors" target="_blank" rel="noopener noreferrer">Tentang Kami</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
