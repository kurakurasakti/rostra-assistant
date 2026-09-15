'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  MessageSquare, 
  Phone, 
  Check, 
  Zap, 
  Sparkles, 
  Wand2, 
  Save, 
  AlertCircle,
  Terminal,
  Activity
} from 'lucide-react';

export default function AISettingsTerminal() {
  const [activeTab, setActiveTab] = useState('profil');
  const [preset, setPreset] = useState('profesional');
  const [hasChanges, setHasChanges] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testOutput, setTestOutput] = useState('');

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const handleTest = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setTestOutput("Halo! Terima kasih telah menghubungi layanan pelanggan kami. Ada yang bisa saya bantu hari ini terkait produk Anda?");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#F4F4F5] font-sans selection:bg-[#8B5CF6] selection:text-white pb-24">
      {/* HEADER TACTICAL */}
      <header className="border-b border-[#26262B] bg-[#0B0B0C] sticky top-0 z-20">
        <div className="max-w-[1024px] mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-24px font-bold tracking-tight text-white">Pengaturan Chatbot</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131316] border border-[#34D399]/30">
                <div className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                <span className="text-[12px] font-mono text-[#34D399] uppercase tracking-[0.08em]">[ SYS: AKTIF ]</span>
              </div>
            </div>
            <p className="text-[13px] leading-[1.55] text-[#A1A1AA] font-mono">
              // Konfigurasi parameter operasional AI dan konektivitas WhatsApp
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-[1024px] mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 relative">
        
        {/* STICKY NAV LEFT */}
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="sticky top-32 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-4 lg:pb-0">
            {[
              { id: 'profil', icon: Bot, label: 'Profil Bisnis' },
              { id: 'gaya', icon: MessageSquare, label: 'Gaya Komunikasi AI' },
              { id: 'koneksi', icon: Phone, label: 'Koneksi WhatsApp' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] text-[14px] font-medium transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0C] ${
                  activeTab === item.id 
                    ? 'bg-[#131316] text-[#F4F4F5] border border-[#26262B]' 
                    : 'text-[#8B8B93] hover:text-[#F4F4F5] hover:bg-[#131316]/50 border border-transparent'
                }`}
              >
                <item.icon size={18} className={activeTab === item.id ? 'text-[#8B5CF6]' : ''} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 max-w-[720px] flex flex-col gap-[32px]">
          
          {/* SECTION 1: PROFIL BISNIS */}
          <section className="space-y-[16px]">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#8B8B93]" />
              <h2 className="text-[12px] uppercase tracking-[0.08em] text-[#8B8B93] font-mono">
                Profil Bisnis
              </h2>
            </div>
            
            <div className="bg-[#131316] rounded-[14px] border border-[#26262B] p-[24px] space-y-[24px]">
              <div className="space-y-[12px]">
                <label className="block text-[14px] font-medium text-[#F4F4F5]">Nama Bisnis</label>
                <input 
                  type="text" 
                  defaultValue="Toko Jaya Abadi"
                  className="w-full bg-[#1A1A1E] border border-[#26262B] hover:border-[#3A3A41] rounded-[10px] px-4 py-2.5 text-[14px] text-[#F4F4F5] placeholder-[#8B8B93] outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:border-transparent transition-all"
                />
              </div>
              <div className="space-y-[12px]">
                <label className="block text-[14px] font-medium text-[#F4F4F5]">Konteks Bisnis / Penjelasan Produk</label>
                <textarea 
                  rows={3}
                  defaultValue="Kami menjual peralatan elektronik rumah tangga dengan garansi resmi. Jam operasional 08:00 - 17:00."
                  className="w-full bg-[#1A1A1E] border border-[#26262B] hover:border-[#3A3A41] rounded-[10px] px-4 py-3 text-[14px] text-[#F4F4F5] placeholder-[#8B8B93] outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:border-transparent transition-all resize-y"
                />
              </div>
            </div>
          </section>

          {/* SECTION 2: GAYA KOMUNIKASI */}
          <section className="space-y-[16px]">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#8B8B93]" />
              <h2 className="text-[12px] uppercase tracking-[0.08em] text-[#8B8B93] font-mono">
                Gaya Komunikasi AI
              </h2>
            </div>
            
            {/* Presets Radiogroup */}
            <div 
              role="radiogroup" 
              aria-label="Preset Gaya Komunikasi"
              className="grid grid-cols-1 md:grid-cols-2 gap-[16px]"
            >
              {[
                { id: 'profesional', icon: Zap, title: 'Profesional', desc: 'Sopan, efisien, dan langsung ke inti.' },
                { id: 'santai', icon: Sparkles, title: 'Santai & Ramah', desc: 'Gunakan emoji dan bahasa kasual.' },
                { id: 'kustom', icon: Wand2, title: 'Kustom', desc: 'Atur instruksi spesifik Anda sendiri.' }
              ].map((p) => {
                const isSelected = preset === p.id;
                return (
                  <label 
                    key={p.id}
                    className={`relative flex flex-col p-[24px] rounded-[14px] border cursor-pointer transition-all outline-none focus-within:ring-2 focus-within:ring-[#8B5CF6] focus-within:ring-offset-2 focus-within:ring-offset-[#0B0B0C] ${
                      isSelected 
                        ? 'bg-[rgba(139,92,246,0.12)] border-[#8B5CF6]' 
                        : 'bg-[#131316] border-[#26262B] hover:border-[#3A3A41]'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="preset" 
                      value={p.id} 
                      checked={isSelected}
                      onChange={(e) => setPreset(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-start mb-[12px]">
                      <div className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center ${isSelected ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-[#1A1A1E] text-[#A1A1AA]'}`}>
                        <p.icon size={18} />
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[16px] font-semibold text-[#F4F4F5] mb-1">{p.title}</span>
                    <span className="text-[13px] leading-[1.55] text-[#A1A1AA] line-clamp-1">{p.desc}</span>
                  </label>
                );
              })}
            </div>

            {/* Custom Textarea Expansion */}
            {preset === 'kustom' && (
              <div className="bg-[#131316] rounded-[14px] border border-[#8B5CF6]/30 p-[24px] space-y-[12px] animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-[14px] font-medium text-[#F4F4F5]">Instruksi Kustom Prompt</label>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[13px] font-medium text-[#F4F4F5] border border-[#26262B] hover:bg-[#1A1A1E] transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-[#F4F4F5] border-t-transparent rounded-full animate-spin"/> Menganalisa...</span>
                    ) : (
                      <><Sparkles size={14} className="text-[#8B5CF6]" /> Analisa dari Chat WA</>
                    )}
                  </button>
                </div>
                <textarea 
                  rows={4}
                  placeholder="Ketik instruksi bagaimana AI harus menjawab..."
                  className="w-full bg-[#1A1A1E] border border-[#26262B] hover:border-[#3A3A41] rounded-[10px] px-4 py-3 text-[14px] text-[#F4F4F5] placeholder-[#8B8B93] outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:border-transparent transition-all resize-y"
                />
                <p className="text-[13px] text-[#8B8B93] font-mono">Kosongkan jika ingin memakai preset apa adanya.</p>
              </div>
            )}

            {/* COBA DRAFT AI */}
            <div className="bg-[#1A1A1E] rounded-[14px] p-[24px] space-y-[16px]">
              <div className="flex justify-between items-center">
                <h3 className="text-[14px] font-semibold text-[#F4F4F5]">Coba Draft AI</h3>
                <span className="text-[12px] text-[#8B8B93] font-mono bg-[#131316] px-2 py-1 rounded border border-[#26262B]">SIMULATION_MODE</span>
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Ketik pesan pelanggan..."
                  className="flex-1 bg-[#131316] border border-[#26262B] hover:border-[#3A3A41] rounded-[10px] px-4 py-2.5 text-[14px] text-[#F4F4F5] outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
                />
                <button 
                  onClick={handleTest}
                  disabled={isTesting}
                  className="px-4 py-2.5 rounded-[10px] bg-[#131316] border border-[#26262B] text-[#F4F4F5] text-[14px] font-medium hover:bg-[#26262B] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] disabled:opacity-50"
                >
                  {isTesting ? 'Memproses...' : 'Coba'}
                </button>
              </div>
              
              {/* Chat Bubble Preview */}
              {(isTesting || testOutput) && (
                <div className="pt-4 border-t border-[#26262B] mt-4">
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <span className="text-[12px] text-[#A1A1AA] font-mono ml-2">Balasan AI:</span>
                    <div className="bg-[rgba(139,92,246,0.12)] border border-[#8B5CF6]/20 rounded-[14px] rounded-tl-sm px-4 py-3 text-[14px] text-[#F4F4F5] leading-[1.6]">
                      {isTesting ? (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : testOutput}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

        </main>
      </div>

      {/* STICKY ACTION BAR */}
      {hasChanges && (
        <div 
          role="region" 
          aria-live="polite"
          className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none"
        >
          <div className="max-w-[720px] mx-auto ml-auto lg:ml-[calc(50%-360px+128px)] bg-[#131316]/90 backdrop-blur-md border border-[#26262B] rounded-[14px] p-4 flex items-center justify-between shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-2 text-[#8B8B93] text-[13px] font-mono">
              <AlertCircle size={16} className="text-[#8B5CF6]" />
              <span>PERUBAHAN BELUM DISIMPAN</span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setHasChanges(false)}
                className="px-4 py-2 rounded-[10px] text-[14px] font-medium text-[#F4F4F5] hover:bg-[#1A1A1E] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setHasChanges(false);
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-[10px] bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-[14px] font-medium transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#131316]"
              >
                <Save size={16} />
                Simpan Profil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
