import { NextResponse } from "next/server"

const DEFAULT_ERROR_MESSAGE = "Terjadi kesalahan di server. Coba lagi beberapa saat lagi."

/**
 * Wraps a route handler so an unhandled throw (AI provider, network/TLS,
 * Supabase, WA service) returns a JSON `{ error }` the UI can show in a toast,
 * instead of a bare 500 with an empty body that breaks `res.json()`.
 *
 * Handle expected failures inside the handler with a specific status/message;
 * this is the safety net for everything else.
 */
export function withErrorHandler<A extends unknown[]>(
  label: string,
  handler: (...args: A) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (err) {
      console.error(`[${label}] Unhandled error:`, err)
      return NextResponse.json(
        {
          error: DEFAULT_ERROR_MESSAGE,
          ...(process.env.NODE_ENV === "development" && { detail: String(err) }),
        },
        { status: 500 },
      )
    }
  }
}
