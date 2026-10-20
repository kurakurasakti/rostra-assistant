export type ApiResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: string }

const NETWORK_ERROR = "Gagal terhubung ke server. Periksa koneksi lalu coba lagi."

/**
 * fetch() for our own /api routes that never throws. Network failures,
 * non-JSON bodies and `{ error }` responses all become `{ ok: false, error }`,
 * so callers always reset their loading state and can show a toast.
 */
export async function apiFetch<T = Record<string, unknown>>(
  input: string,
  init?: RequestInit,
  fallbackError = "Terjadi kesalahan. Coba lagi.",
): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch {
    return { ok: false, data: null, error: NETWORK_ERROR }
  }

  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !body || body.error) {
    return { ok: false, data: null, error: body?.error ?? fallbackError }
  }
  return { ok: true, data: body, error: null }
}
