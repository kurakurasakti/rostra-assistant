'use client';
import React from 'react';
import { Bot, MessageSquare, Phone, Save, Sparkles, Send } from 'lucide-react';

export default function BentoSettings() {
  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-8 lg:p-12 text-[#F4F4F5] font-sans selection:bg-[#8B5CF6]">
      <div className="max-w-[1200px] mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Pengaturan Dashboard</h1>
            <p className="text-[#8B8B93] mt-1 text-sm">Kelola operasional dan identitas AI Anda.</p>
          </div>
          <button className="bg-[#8B5CF6] hover:bg-[#7C3AED] px-6 py-2.5 rounded-[12px] font-medium flex items-center gap-2 transition-all">
            <Save size={18} /> Simpan Perubahan
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(200px,auto)]">
          {/* Card 1: Profil */}
          <div className="md:col-span-12 lg:col-span-8 bg-[#111111] border border-[#26262B] rounded-[24px] p-8 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-[#1A1A1E] rounded-xl"><Bot size={24} className="text-[#8B5CF6]" /></div>
                <h2 className="text-xl font-semibold">Profil Bisnis</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-[#8B8B93] uppercase tracking-wider font-semibold">Nama Bisnis</label>
                  <input type="text" defaultValue="Toko Jaya Abadi" className="w-full bg-[#1A1A1E] border border-[#26262B] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#8B5CF6] transition-all" />
                </div>
                <div className="space-y-2 md:row-span-2">
                  <label className="text-xs text-[#8B8B93] uppercase tracking-wider font-semibold">Konteks</label>
                  <textarea rows={5} defaultValue="Kami menjual peralatan elektronik rumah tangga dengan garansi resmi. Jam operasional 08:00 - 17:00." className="w-full h-[calc(100%-24px)] bg-[#1A1A1E] border border-[#26262B] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#8B5CF6] resize-none transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Koneksi */}
          <div className="md:col-span-6 lg:col-span-4 bg-gradient-to-br from-[#111111] to-[#1A1A1E] border border-[#26262B] rounded-[24px] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#34D399] to-transparent opacity-50" />
            <div className="w-20 h-20 bg-[#34D399]/10 rounded-full flex items-center justify-center mb-6">
              <Phone size={36} className="text-[#34D399]" />
            </div>
            <h2 className="text-xl font-semibold mb-2">WhatsApp Aktif</h2>
            <p className="text-[#8B8B93] text-sm">+62 812-3456-7890</p>
            <div className="mt-6 px-4 py-1.5 rounded-full bg-[#34D399]/10 text-[#34D399] text-xs font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" /> TERHUBUNG
            </div>
          </div>

          {/* Card 3: Gaya Komunikasi */}
          <div className="md:col-span-6 lg:col-span-6 bg-[#111111] border border-[#26262B] rounded-[24px] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#1A1A1E] rounded-xl"><MessageSquare size={24} className="text-[#8B5CF6]" /></div>
              <h2 className="text-xl font-semibold">Gaya Komunikasi</h2>
            </div>
            <div className="flex flex-col gap-4">
              <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6] rounded-xl p-4 cursor-pointer flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-[#8B5CF6] text-lg">Profesional</h3>
                  <p className="text-sm text-[#8B8B93] mt-0.5">Sopan dan efisien</p>
                </div>
                <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center border-2 border-[#111111] ring-2 ring-[#8B5CF6]" />
              </div>
              <div className="bg-[#1A1A1E] border border-[#26262B] rounded-xl p-4 cursor-pointer hover:border-[#3A3A41] transition-all">
                <h3 className="font-semibold text-[#F4F4F5] text-lg">Santai</h3>
                <p className="text-sm text-[#8B8B93] mt-0.5">Gunakan emoji dan ramah</p>
              </div>
            </div>
          </div>

          {/* Card 4: Uji Coba */}
          <div className="md:col-span-12 lg:col-span-6 bg-[#111111] border border-[#26262B] rounded-[24px] p-8 flex flex-col shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#1A1A1E] rounded-xl"><Sparkles size={24} className="text-[#8B5CF6]" /></div>
              <h2 className="text-xl font-semibold">Uji Coba AI</h2>
            </div>
            <div className="flex-1 bg-[#0B0B0C] border border-[#26262B] rounded-xl p-6 flex flex-col justify-end">
              <div className="flex gap-2">
                <input type="text" placeholder="Ketik pesan..." className="flex-1 bg-[#1A1A1E] border border-[#26262B] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#8B5CF6] transition-all" />
                <button className="bg-[#8B5CF6] text-white px-5 rounded-xl font-medium flex items-center justify-center hover:bg-[#7C3AED] transition-all">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
