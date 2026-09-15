'use client';
import React from 'react';
import { Save } from 'lucide-react';

export default function MinimalistSettings() {
  return (
    <div className="min-h-screen bg-black text-[#EDEDED] p-8 md:p-16 lg:p-32 font-sans font-light selection:bg-white selection:text-black">
      <div className="max-w-[720px] mx-auto space-y-32">
        
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight mb-3">Pengaturan</h1>
            <p className="text-[#A1A1AA] text-lg">Konfigurasi AI dan identitas bisnis.</p>
          </div>
          <button className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
            Simpan
          </button>
        </header>

        <section className="space-y-16">
          <h2 className="text-xs text-[#52525B] uppercase tracking-[0.2em] font-medium border-b border-[#27272A] pb-4">01 — Profil Bisnis</h2>
          
          <div className="space-y-12">
            <div className="group">
              <label className="block text-sm text-[#A1A1AA] mb-4 transition-colors group-focus-within:text-white font-medium">Nama Bisnis</label>
              <input type="text" defaultValue="Toko Jaya Abadi" className="w-full bg-transparent border-b border-[#27272A] pb-4 text-2xl md:text-3xl outline-none focus:border-white transition-colors" />
            </div>

            <div className="group">
              <label className="block text-sm text-[#A1A1AA] mb-4 transition-colors group-focus-within:text-white font-medium">Konteks Bisnis</label>
              <textarea rows={3} defaultValue="Kami menjual elektronik rumah tangga dengan garansi resmi. Jam operasional 08:00 - 17:00." className="w-full bg-transparent border-b border-[#27272A] pb-4 text-xl md:text-2xl outline-none focus:border-white transition-colors resize-none text-[#EDEDED]" />
            </div>
          </div>
        </section>

        <section className="space-y-16">
          <h2 className="text-xs text-[#52525B] uppercase tracking-[0.2em] font-medium border-b border-[#27272A] pb-4">02 — Gaya Komunikasi</h2>
          <div className="flex gap-8 flex-wrap">
            <button className="text-2xl md:text-3xl border-b-2 border-white pb-2 font-medium">Profesional</button>
            <button className="text-2xl md:text-3xl text-[#52525B] hover:text-[#A1A1AA] transition-colors font-medium">Santai</button>
            <button className="text-2xl md:text-3xl text-[#52525B] hover:text-[#A1A1AA] transition-colors font-medium">Kustom</button>
          </div>
        </section>

        <section className="space-y-16">
          <h2 className="text-xs text-[#52525B] uppercase tracking-[0.2em] font-medium border-b border-[#27272A] pb-4">03 — Koneksi WhatsApp</h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-3xl md:text-4xl font-medium tracking-tight">+62 812-3456-7890</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-emerald-500 uppercase tracking-widest font-medium">Terhubung</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
 
