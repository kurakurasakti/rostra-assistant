import { Sparkles } from 'lucide-react'

export function WaMockup() {
  return (
    // Decorative product mockup — hidden from assistive tech, no focusable controls inside
    <div
      aria-hidden="true"
      className="rounded-2xl shadow-xl overflow-hidden border w-full"
      style={{ maxWidth: '340px', borderColor: '#E8E4DC', backgroundColor: '#ECE5DD' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #4a2560 0%, #703c8b 100%)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <span className="text-white font-bold text-xs">R</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-xs truncate">Rina Sari</p>
          <p className="text-white/60 text-[10px]">0812-3456-7890</p>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
        >
          Inbox Glim
        </span>
      </div>

      {/* Chat area */}
      <div className="p-3 space-y-2 min-h-[200px]">
        {/* Incoming message 1 */}
        <div
          className="animate-chat-bubble-1 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]"
          style={{ backgroundColor: '#fff' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: '#1A1A18' }}>
            Halo kak, mau tanya soal kebaya custom dong, ada nggak? 🙏
          </p>
          <p className="text-right text-[10px] mt-1" style={{ color: '#9B9590' }}>
            11:23
          </p>
        </div>

        {/* Incoming message 2 */}
        <div
          className="animate-chat-bubble-2 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]"
          style={{ backgroundColor: '#fff' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: '#1A1A18' }}>
            Berapa harga mulai dari untuk size M?
          </p>
          <p className="text-right text-[10px] mt-1" style={{ color: '#9B9590' }}>
            11:24
          </p>
        </div>

        {/* AI draft card */}
        <div
          className="animate-ai-draft rounded-xl border-2 p-3 mt-3"
          style={{ backgroundColor: '#FFFBF3', borderColor: '#E8A33D' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles
              className="animate-amber-pulse w-3 h-3"
              style={{ color: '#E8A33D' }}
            />
            <span className="text-[10px] font-semibold" style={{ color: '#B8720A' }}>
              Draft AI
            </span>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#1A1A18' }}>
            Halo Rina! Ada kok kak 😊 Kebaya custom kami mulai dari{' '}
            <span className="font-medium">Rp 850.000</span> untuk size M. Bisa konsultasi gratis
            dulu soal desain dan bahan...
          </p>
          <div className="flex gap-2">
            <div
              className="flex-1 text-center text-[10px] font-medium py-1.5 rounded-lg border"
              style={{ borderColor: '#C9C3BB', color: '#6B6862', backgroundColor: 'transparent' }}
            >
              Ubah
            </div>
            <div
              className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg"
              style={{ backgroundColor: '#703c8b', color: '#fff' }}
            >
              ✓ Kirim
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
