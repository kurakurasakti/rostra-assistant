import type { NextConfig } from "next"
import packageJson from "./package.json"

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Static CSP rather than a nonce-based one. A per-request nonce forces
  // dynamic rendering across the whole app, which is too large a change
  // to make at launch. This still blocks the vectors that matter here:
  // plugin execution, base-tag hijacking, framing, and form exfiltration.
  // script-src keeps 'unsafe-inline' for the hydration scripts Next
  // emits, so this is not a substitute for the nonce approach — upgrade
  // to nonces once dynamic rendering is affordable.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://dpeyfucyrhyuhliitcfd.supabase.co",
      "font-src 'self' data:",
      "media-src 'self' blob: https://dpeyfucyrhyuhliitcfd.supabase.co",
      // Connect targets: Supabase (auth, realtime, REST, storage) plus
      // the WA service that proxies inbound/outbound messages.
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${process.env.WA_SERVICE_URL ?? "http://localhost:3100"}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
