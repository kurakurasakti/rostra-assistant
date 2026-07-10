import type { ReactNode } from 'react'
import { Logo } from '@/components/logo'
import { WaMockup } from '@/components/landing/wa-mockup'

export function AuthBrandPanel({ headline, tagline }: { headline: ReactNode; tagline: string }) {
  return (
    <div
      className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 40%, #8b5aa3 100%)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
      </div>

      <div className="relative">
        <Logo variant="lockup" tone="dark" height={30} />
      </div>

      <div className="relative flex justify-center py-8">
        <WaMockup />
      </div>

      <div className="relative space-y-3">
        <h1 className="text-white font-display font-bold text-3xl xl:text-4xl leading-tight tracking-tight">
          {headline}
        </h1>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">{tagline}</p>
        <p className="text-white/40 text-xs pt-4">
          © 2025 Glim. Dibuat dengan ♥ untuk bisnis Indonesia.
        </p>
      </div>
    </div>
  )
}
