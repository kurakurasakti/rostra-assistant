'use client';
import React from 'react';

export default function SwissSettings() {
  return (
    <div className="min-h-screen bg-[#F4F4F0] text-[#050505] p-8 md:p-16 font-sans">
      <header className="border-b-4 border-[#050505] pb-8 mb-12 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">PENGATURAN</h1>
          <p className="text-xl font-bold uppercase mt-4 tracking-widest text-[#E61919]">SYS_CONFIG // 01</p>
        </div>
        <div className="text-left md:text-right">
          <div className="w-4 h-4 bg-[#E61919] mb-2 md:ml-auto" />
          <span className="font-mono font-bold">STATUS: AKTIF</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 lg:border-r-2 lg:border-[#050505] lg:pr-8">
          <ul className="space-y-4 font-bold text-xl uppercase tracking-wider">
            <li className="text-[#E61919]">▶ PROFIL BISNIS</li>
            <li className="hover:text-[#E61919] cursor-pointer text-gray-500">GAYA KOMUNIKASI</li>
            <li className="hover:text-[#E61919] cursor-pointer text-gray-500">KONEKSI WA</li>
          </ul>
        </aside>

        <main className="lg:col-span-9 space-y-16">
          <section>
            <h2 className="text-4xl font-black uppercase border-b-2 border-[#050505] pb-2 mb-8">PROFIL BISNIS</h2>
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest mb-2">NAMA BISNIS</label>
                <input type="text" defaultValue="Toko Jaya Abadi" className="w-full bg-transparent border-2 border-[#050505] p-4 text-xl font-bold outline-none focus:border-[#E61919] rounded-none shadow-[4px_4px_0_0_#050505]" />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest mb-2">KONTEKS BISNIS</label>
                <textarea rows={4} defaultValue="Kami menjual peralatan elektronik rumah tangga dengan garansi resmi. Jam operasional 08:00 - 17:00." className="w-full bg-transparent border-2 border-[#050505] p-4 text-xl font-bold outline-none focus:border-[#E61919] rounded-none resize-none shadow-[4px_4px_0_0_#050505]" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-4xl font-black uppercase border-b-2 border-[#050505] pb-2 mb-8">GAYA KOMUNIKASI AI</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['PROFESIONAL', 'SANTAI', 'KUSTOM'].map((preset, i) => (
                <div key={preset} className={`border-2 border-[#050505] p-6 cursor-pointer flex flex-col justify-between aspect-square transition-all ${i === 0 ? 'bg-[#050505] text-[#F4F4F0] shadow-[8px_8px_0_0_#E61919]' : 'bg-white hover:bg-[#E61919] hover:text-[#F4F4F0] shadow-[8px_8px_0_0_#050505] hover:shadow-[8px_8px_0_0_#050505]'}`}>
                  <h3 className="text-2xl font-black">{preset}</h3>
                  {i === 0 && <div className="w-6 h-6 bg-[#E61919]" />}
                </div>
              ))}
            </div>
          </section>

          <button className="bg-[#E61919] text-[#F4F4F0] text-2xl font-black px-12 py-6 uppercase hover:bg-[#050505] transition-colors rounded-none w-full shadow-[8px_8px_0_0_#050505] mt-12">
            SIMPAN PERUBAHAN
          </button>
        </main>
      </div>
    </div>
  );
}
