import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  const publicPaths = ['/login', '/register', '/privacy-policy', '/terms', '/about', '/api/auth', '/api/webhook', '/api/whatsapp/connected', '/api/whatsapp/disconnected']
  const isPublic = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  console.log(`[proxy] Path: ${request.nextUrl.pathname}, isPublic: ${isPublic}, hasUser: ${!!user}`)

  if (!user && !isPublic) {
    console.log(`[proxy] Redirecting unauthenticated request on non-public path ${request.nextUrl.pathname} to /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
