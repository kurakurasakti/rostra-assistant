import { Logo } from '@/components/logo'

/**
 * Left brand panel for auth pages. Dark aubergine + batik stitch texture —
 * same visual signature as the landing pricing panel.
 */
export function AuthBrandPanel({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear()
  return (
    <div
      className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #2D1445 0%, #4a2560 70%, #5c3070 100%)' }}
    >
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
      <div className="relative">
        <Logo variant="lockup" tone="dark" height={30} />
      </div>
      <div className="relative">{children}</div>
      <div className="relative">
        <p className="text-white/40 text-xs">© {year} Glim. Dibuat untuk bisnis jasa Indonesia.</p>
      </div>
    </div>
  )
}
