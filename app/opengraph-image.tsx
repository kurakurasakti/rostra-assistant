import { ImageResponse } from 'next/og'

export const alt = 'Glim — AI Assistant WhatsApp untuk Bisnis Indonesia'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #2D1445 0%, #4a2560 60%, #703c8b 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#E8A33D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1A1A18',
              fontSize: '32px',
              fontWeight: 700,
            }}
          >
            G
          </div>
          <div style={{ color: '#fff', fontSize: '40px', fontWeight: 700 }}>Glim</div>
        </div>
        <div
          style={{
            color: '#fff',
            fontSize: '64px',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            maxWidth: '900px',
          }}
        >
          Biar AI yang jaga WhatsApp kamu.
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '30px',
            marginTop: '28px',
            maxWidth: '820px',
            lineHeight: 1.4,
          }}
        >
          Balas pesan dengan gaya bicaramu. Pengingat pembayaran otomatis. Untuk bisnis jasa
          Indonesia.
        </div>
      </div>
    ),
    { ...size }
  )
}
