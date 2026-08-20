import { cn } from "@/lib/utils"

type LogoVariant = "mark" | "lockup"
type LogoTone = "light" | "dark"

const LOCKUP_SRC: Record<LogoTone, string> = {
  light: "/assets/logo-lockup-light.svg",
  dark: "/assets/logo-lockup-dark.svg",
}

// SVGs are already optimized vectors — plain <img> skips next/image's
// raster pipeline (which needs dangerouslyAllowSVG) entirely.
export function Logo({
  variant = "lockup",
  tone = "light",
  className,
  height = variant === "mark" ? 32 : 28,
}: {
  variant?: LogoVariant
  tone?: LogoTone
  className?: string
  height?: number
}) {
  if (variant === "mark") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/assets/logo-i-mark.svg"
        alt="Glim"
        height={height}
        width={height * (64 / 96)}
        className={cn("inline-block", className)}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOCKUP_SRC[tone]}
      alt="Glim — AI Assistant"
      height={height}
      width={height * (232 / 76)}
      className={cn("inline-block", className)}
    />
  )
}
