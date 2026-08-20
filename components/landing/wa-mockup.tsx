import { Sparkles } from "lucide-react"

export function WaMockup() {
  return (
    // Decorative product mockup — hidden from assistive tech, no focusable controls inside
    <div
      aria-hidden="true"
      className="rounded-3xl shadow-2xl overflow-hidden border w-full"
      style={{
        maxWidth: "400px",
        borderColor: "#E8E4DC",
        backgroundColor: "#ECE5DD",
        boxShadow: "0 30px 60px -15px rgba(45,20,69,0.35), 0 8px 24px -8px rgba(232,163,61,0.25)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, #4a2560 0%, #703c8b 100%)" }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">Rina Sari</p>
          <p className="text-white/60 text-xs">0812-3456-7890</p>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
        >
          Inbox Glim
        </span>
      </div>

      {/* Chat area */}
      <div className="p-4 space-y-2.5 min-h-[220px]">
        {/* Incoming message 1 */}
        <div
          className="animate-chat-bubble-1 rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]"
          style={{ backgroundColor: "#fff" }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "#1A1A18" }}>
            Halo kak, mau tanya soal kebaya custom dong, ada nggak? 🙏
          </p>
          <p className="text-right text-[10px] mt-1" style={{ color: "#9B9590" }}>
            11:23
          </p>
        </div>

        {/* Incoming message 2 */}
        <div
          className="animate-chat-bubble-2 rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]"
          style={{ backgroundColor: "#fff" }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "#1A1A18" }}>
            Berapa harga mulai dari untuk size M?
          </p>
          <p className="text-right text-[10px] mt-1" style={{ color: "#9B9590" }}>
            11:24
          </p>
        </div>

        {/* AI draft card — signature element: the visible proof the product works */}
        <div
          className="animate-ai-draft animate-draft-glow rounded-xl border-2 p-3.5 mt-3"
          style={{ backgroundColor: "#FFFBF3", borderColor: "#E8A33D" }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="animate-amber-pulse w-3.5 h-3.5" style={{ color: "#E8A33D" }} />
            <span className="text-xs font-semibold" style={{ color: "#B8720A" }}>
              Draft AI
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "#1A1A18" }}>
            Halo Rina! Ada kok kak 😊 Kebaya custom kami mulai dari{" "}
            <span className="font-medium">Rp 850.000</span> untuk size M. Bisa konsultasi gratis
            dulu soal desain dan bahan...
          </p>
          <div className="flex gap-2">
            <div
              className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg border"
              style={{ borderColor: "#C9C3BB", color: "#6B6862", backgroundColor: "transparent" }}
            >
              Ubah
            </div>
            <div
              className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg"
              style={{ backgroundColor: "#703c8b", color: "#fff" }}
            >
              ✓ Kirim
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
