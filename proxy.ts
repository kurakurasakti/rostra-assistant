import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicPaths = [
    "/login",
    "/register",
    "/privacy-policy",
    "/terms",
    "/about",
    "/pricing",
    "/checkout",
    "/payment",
    "/api/auth",
    "/api/webhook",
    "/api/payment",
    "/api/subscription",
    "/api/whatsapp/connected",
    "/api/whatsapp/disconnected",
    "/assets",
    "/landing",
    "/favicon.ico",
    "/icon.svg",
    "/apple-icon.svg",
    "/og-image.svg",
    "/opengraph-image",
  ]
  const pathname = request.nextUrl.pathname
  const isPublic = pathname === "/" || publicPaths.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (user && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|assets|landing|favicon.ico|icon.svg|apple-icon.svg|og-image.svg).*)",
  ],
}
