"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Sparkles,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";
import type { Profile, BusinessKnowledgeStructured } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessKnowledgeSection from "@/components/settings/BusinessKnowledgeSection";
import { SettingsNav, type SettingsTab } from "@/components/settings/SettingsNav";
import WhatsAppSection from "@/components/settings/WhatsAppSection";
import AIRulesSection from "@/components/settings/AIRulesSection";
import ImportDataSection from "@/components/settings/ImportDataSection";
import TemplatesSection from "@/components/settings/TemplatesSection";

type AnalyzeStep = "idle" | "building" | "analyzing" | "preview";

interface UploadedFile {
  name: string;
  text: string;
  senders: string[];
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Section A state
  const [businessName, setBusinessName] = useState("");
  const [brandVoice, setBrandVoice] = useState("");

  // Brand voice analysis state
  const [analyzeStep, setAnalyzeStep] = useState<AnalyzeStep>("idle");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedSender, setSelectedSender] = useState("");
  const [brandVoicePreview, setBrandVoicePreview] = useState("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const allSenders = [...new Set(uploadedFiles.flatMap((f) => f.senders))];
  const combinedText = uploadedFiles.map((f) => f.text).join("\n");

  // Draft test state
  const [testMessage, setTestMessage] = useState("");
  const [draftResult, setDraftResult] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);

  // Section C: Business Knowledge state
  const [businessKnowledgeRaw, setBusinessKnowledgeRaw] = useState<string | null>(null);
  const [businessKnowledgeStructured, setBusinessKnowledgeStructured] = useState<BusinessKnowledgeStructured | null>(null);

  // Section D: Escalation Rules state
  const [escalationKeywords, setEscalationKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [autoReplyLevel, setAutoReplyLevel] = useState(1);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  useEffect(() => {
    const tab = searchParams.get("tab");
    const valid: SettingsTab[] = ["profile", "whatsapp", "business", "ai", "import"];
    if (tab && (valid as string[]).includes(tab)) setActiveTab(tab as SettingsTab);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setBusinessName(data.business_name ?? "");
        setBrandVoice(data.brand_voice ?? "");

        // Section C
        setBusinessKnowledgeRaw(data.business_knowledge_raw ?? null);
        setBusinessKnowledgeStructured(data.business_knowledge_structured ?? null);

        // Section D
        setEscalationKeywords(Array.isArray(data.escalation_keywords) ? data.escalation_keywords : []);
        setAutoReplyLevel(data.auto_reply_level ?? 1);
        setFeedbackCount(data.feedback_count ?? 0);

      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: businessName.trim(),
        brand_voice: brandVoice.trim(),
        escalation_keywords: escalationKeywords,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) toast.error("Gagal menyimpan. Coba lagi.");
    else toast.success("Pengaturan berhasil disimpan.");
    setSaving(false);
  }

  // --- Brand voice analysis ---

  async function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    if (!newFiles.length) return;
    // Reset input so same file can be re-added after removal
    e.target.value = "";
    setAnalyzeLoading(true);

    const formData = new FormData();
    newFiles.forEach((f) => formData.append("files", f));

    const res = await fetch("/api/settings/analyze-chat", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      toast.error(data.error ?? "Gagal membaca file.");
      setAnalyzeLoading(false);
      return;
    }

    const texts = await Promise.all(newFiles.map((f) => f.text()));
    const entries: UploadedFile[] = newFiles.map((f, i) => ({
      name: f.name,
      text: texts[i],
      senders: data.senders,
    }));

    setUploadedFiles((prev) => {
      // dedupe by name — re-adding same filename replaces old entry
      const kept = prev.filter((p) => !newFiles.some((f) => f.name === p.name));
      return [...kept, ...entries];
    });
    setAnalyzeStep("building");
    setAnalyzeLoading(false);
  }

  function handleRemoveFile(name: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleAnalyzeVoice() {
    if (!selectedSender) return;
    setAnalyzeLoading(true);
    setAnalyzeStep("analyzing");

    const res = await fetch("/api/settings/analyze-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: selectedSender,
        file_content: combinedText,
      }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      toast.error(data.error ?? "Gagal menganalisa chat.");
      setAnalyzeStep("building");
      setAnalyzeLoading(false);
      return;
    }

    setBrandVoicePreview(data.brand_voice);
    setAnalyzeStep("preview");
    setAnalyzeLoading(false);
  }

  async function handleUseVoice() {
    const voice = brandVoicePreview;
    setBrandVoice(voice);
    setAnalyzeStep("idle");
    setBrandVoicePreview("");
    setUploadedFiles([]);
    setSelectedSender("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ brand_voice: voice, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) toast.error("Gagal menyimpan gaya komunikasi.");
      else toast.success("Gaya komunikasi berhasil disimpan.");
    }
  }

  // --- Draft test ---

  async function handleTestDraft() {
    if (!testMessage.trim()) return;
    setDraftLoading(true);
    const res = await fetch("/api/messages/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: testMessage, brand_voice: brandVoice }),
    });
    const data = await res.json();
    if (res.ok && data.draft) setDraftResult(data.draft);
    else
      toast.error(
        "Gagal membuat draft. Pastikan OpenRouter API key sudah diisi.",
      );
    setDraftLoading(false);
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-enter">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola profil bisnis dan koneksi WhatsApp.</p>
      </div>

      <SettingsNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Onboarding banner (shown on any tab) */}
      {profile && !profile.onboarding_complete && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Lengkapi koneksi WhatsApp</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">Scan QR di tab Koneksi WhatsApp untuk mulai menggunakan Rostra.</p>
          </div>
        </div>
      )}

      {profile?.onboarding_complete && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Rostra aktif dan siap digunakan.</p>
        </div>
      )}

      {activeTab === "profile" && (
        <form id="business-form" onSubmit={handleSaveProfile} className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div>
            <h2 className="font-display font-semibold text-sm">Profil Bisnis</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Nama bisnis dan gaya komunikasi AI.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessName" className="text-sm font-medium">Nama Bisnis</Label>
            <Input id="businessName" placeholder="Contoh: Studio Foto Melati" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="h-10" />
          </div>

          {/* Brand voice subsection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="brandVoice" className="text-sm font-medium">
                Gaya Komunikasi AI <span className="text-muted-foreground font-normal">(opsional)</span>
              </Label>
              {analyzeStep === "idle" && (
                <label className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                  <Sparkles className="w-3 h-3" />
                  Analisa dari Chat WA
                  <input type="file" accept=".txt" multiple className="hidden" onChange={handleAddFiles} />
                </label>
              )}
            </div>

            <Textarea id="brandVoice" placeholder="Contoh: Selalu sapa dengan 'Halo Kak 😊'. Pesan singkat 1-2 kalimat. Gunakan emoji 🙏 di akhir pesan." value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} rows={3} className="resize-none text-sm" />

            {/* Analyze flow */}
            {analyzeStep === "building" && (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">File chat ({uploadedFiles.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((f) => (
                      <div key={f.name} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs">
                        <span className="max-w-[160px] truncate">{f.name}</span>
                        <button type="button" onClick={() => handleRemoveFile(f.name)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/40 cursor-pointer transition-colors">
                      {analyzeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {analyzeLoading ? "Membaca..." : "Tambah File"}
                      <input ref={addFileInputRef} type="file" accept=".txt" multiple className="hidden" onChange={handleAddFiles} disabled={analyzeLoading} />
                    </label>
                  </div>
                </div>

                {uploadedFiles.length > 0 && allSenders.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Siapa nama admin bisnis kamu di chat ini?</p>
                    <Select value={selectedSender} onValueChange={(v) => { if (v) setSelectedSender(v); }}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Pilih nama admin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allSenders.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">AI akan mempelajari gaya balas pesan dari nama yang kamu pilih.</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" className="h-8 text-xs" onClick={handleAnalyzeVoice} disabled={!selectedSender || uploadedFiles.length === 0 || analyzeLoading}>
                    <Sparkles className="w-3 h-3 mr-1.5" /> Analisa Gaya Chat
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setAnalyzeStep("idle"); setUploadedFiles([]); setSelectedSender(""); }}>
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {analyzeStep === "analyzing" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> AI sedang mempelajari gaya chat kamu...
              </div>
            )}

            {analyzeStep === "preview" && (
              <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                <p className="text-xs font-medium">Hasil analisa:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{brandVoicePreview}</p>
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" size="sm" className="h-8 text-xs" onClick={handleUseVoice}>Gunakan Gaya Ini</Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAnalyzeStep("building")}><RefreshCcw className="w-3 h-3 mr-1" /> Analisa Ulang</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setBrandVoice(brandVoicePreview); setAnalyzeStep("idle"); }}>Edit Manual</Button>
                </div>
              </div>
            )}

            {brandVoice && analyzeStep === "idle" && (
              <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Coba Draft AI</p>
                <div className="flex gap-2">
                  <Input placeholder="kak mau tanya harga baju seragam 50 pcs" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} className="h-8 text-xs flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTestDraft(); } }} />
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={handleTestDraft} disabled={draftLoading || !testMessage.trim()}>
                    {draftLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Coba"}
                  </Button>
                </div>
                {draftResult && <div className="text-xs p-2 rounded bg-background border border-border text-foreground leading-relaxed">{draftResult}</div>}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-1 border-t border-border">
            <Button type="submit" className="font-display font-medium" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Profil"}
            </Button>
          </div>
        </form>
      )}

      {activeTab === "whatsapp" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <WhatsAppSection
            initialNotificationNumber={profile?.notification_wa_number}
            onNotificationSaved={(number) => setProfile((prev) => prev ? { ...prev, notification_wa_number: number } : prev)}
          />
        </div>
      )}

      {activeTab === "business" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <BusinessKnowledgeSection
            initialRaw={businessKnowledgeRaw}
            initialStructured={businessKnowledgeStructured}
            onSave={(raw, structured) => {
              setBusinessKnowledgeRaw(raw);
              setBusinessKnowledgeStructured(structured);
            }}
          />
        </div>
      )}

      {activeTab === "ai" && (
        <>
          <div className="rounded-xl border border-border bg-card p-5">
            <AIRulesSection
              initialKeywords={escalationKeywords}
              initialLevel={autoReplyLevel}
              feedbackCount={feedbackCount}
              onSave={(keywords) => setEscalationKeywords(keywords)}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <TemplatesSection />
          </div>
        </>
      )}

      {activeTab === "import" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <ImportDataSection />
        </div>
      )}
    </div>
  );
}
