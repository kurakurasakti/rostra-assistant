export function AuthAmbientBg({
  goldOpacity,
  aubergineOpacity,
}: {
  goldOpacity: number
  aubergineOpacity: number
}) {
  return (
    <>
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
      <div
        aria-hidden="true"
        className="animate-hero-glow absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full pointer-events-none blur-3xl"
        style={{
          background: `radial-gradient(circle, rgba(232,163,61,${goldOpacity}) 0%, rgba(232,163,61,0) 70%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="animate-hero-glow absolute top-1/3 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none blur-3xl"
        style={{
          background: `radial-gradient(circle, rgba(112,60,139,${aubergineOpacity}) 0%, rgba(112,60,139,0) 70%)`,
          animationDelay: "-6s",
        }}
      />
    </>
  )
}
