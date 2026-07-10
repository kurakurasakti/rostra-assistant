"use client";

import { useState, useEffect, useRef } from "react";
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
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCcw,
  Sparkles,
  MessageSquare,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import type { Profile, BusinessKnowledgeStructured, ConversationExample } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import BusinessKnowledgeSection from "@/components/settings/BusinessKnowledgeSection";
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

// ── Pane navigation ──────────────────────────────────────────────
type PaneId =
  | "profil"
  | "whatsapp"
  | "impor"
  | "akun"
  | "voice"
  | "pengetahuan"
  | "eskalasi"
  | "template";

const navGroups: { label: string; items: { id: PaneId; label: string }[] }[] = [
  {
    label: "Pengaturan",
    items: [
      { id: "profil", label: "Profil Bisnis" },
      { id: "whatsapp", label: "Koneksi WhatsApp" },
      { id: "impor", label: "Impor Data" },
      { id: "akun", label: "Akun" },
    ],
  },
  {
    label: "Asisten AI",
    items: [
      { id: "voice", label: "Gaya Bicara" },
      { id: "pengetahuan", label: "Pengetahuan Bisnis" },
      { id: "eskalasi", label: "Aturan & Eskalasi" },
      { id: "template", label: "Template Pesan" },
    ],
  },
];

const allPaneIds = navGroups.flatMap((g) => g.items.map((i) => i.id));

// Old anchor ids from shared ?tab= links keep working.
const legacyTabMap: Record<string, PaneId> = {
  profile: "profil",
  business: "pengetahuan",
  ai: "eskalasi",
  import: "impor",
  danger: "akun",
};

const aiPanes: PaneId[] = ["voice", "pengetahuan", "eskalasi", "template"];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);

  const [activePane, setActivePane] = useState<PaneId>("profil");

  // Profil
  const [businessName, setBusinessName] = useState("");

  // Gaya bicara
  const [brandVoice, setBrandVoice] = useState("");
  const [analyzeStep, setAnalyzeStep] = useState<AnalyzeStep>("idle");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedSender, setSelectedSender] = useState("");
  const [brandVoicePreview, setBrandVoicePreview] = useState("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [examplesCount, setExamplesCount] = useState(0);
  const [examplesByCategory, setExamplesByCategory] = useState<Record<string, number>>({});
  const [conversationExamples, setConversationExamples] = useState<ConversationExample[]>([]);
  const [showExamples, setShowExamples] = useState(false);

  const allSenders = [...new Set(uploadedFiles.flatMap((f) => f.senders))];
  const combinedText = uploadedFiles.map((f) => f.text).join("\n");

  // Coba Draft (panel uji — selalu terlihat di panes Asisten AI)
  const [testMessage, setTestMessage] = useState("");
  const [draftResult, setDraftResult] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);

  // Pengetahuan bisnis
  const [businessKnowledgeRaw, setBusinessKnowledgeRaw] = useState<string | null>(null);
  const [businessKnowledgeStructured, setBusinessKnowledgeStructured] = useState<BusinessKnowledgeStructured | null>(null);

  // Eskalasi
  const [escalationKeywords, setEscalationKeywords] = useState<string[]>([]);
  const [autoReplyLevel, setAutoReplyLevel] = useState(1);
  const [feedbackCount, setFeedbackCount] = useState(0);

  // Akun / danger
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Deep-link: /settings?tab=voice (plus alias lama seperti ?tab=business)
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (!tab) return;
    const target = (allPaneIds as string[]).includes(tab)
      ? (tab as PaneId)
      : legacyTabMap[tab];
    if (target) setActivePane(target);
  }, []);

  function switchPane(id: PaneId) {
    setActivePane(id);
    history.replaceState(null, "", "?tab=" + id);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let activeProfile = data;

      if (error && error.code === "PGRST116") {
        const { data: insertedData, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            business_name: "",
            brand_voice: "Ramah, profesional, dan informatif",
          })
          .select("*")
          .single();

        if (!insertError && insertedData) {
          activeProfile = insertedData;
        } else {
          console.error("Failed to auto-create profile:", insertError);
        }
      }

      if (activeProfile) {
        setProfile(activeProfile);
        setBusinessName(activeProfile.business_name ?? "");
        setBrandVoice(activeProfile.brand_voice ?? "");
        setBusinessKnowledgeRaw(activeProfile.business_knowledge_raw ?? null);
        setBusinessKnowledgeStructured(activeProfile.business_knowledge_structured ?? null);
        setEscalationKeywords(Array.isArray(activeProfile.escalation_keywords) ? activeProfile.escalation_keywords : []);
        setAutoReplyLevel(activeProfile.auto_reply_level ?? 1);
        setFeedbackCount(activeProfile.feedback_count ?? 0);
        if (Array.isArray(activeProfile.conversation_examples) && activeProfile.conversation_examples.length > 0) {
          setConversationExamples(activeProfile.conversation_examples as ConversationExample[]);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  // Satu tombol simpan = satu hal. Profil hanya menyimpan nama bisnis.
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingProfile(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: businessName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Gagal menyimpan. Coba lagi.");
    } else {
      toast.success("Nama bisnis disimpan.");
    }
    setSavingProfile(false);
  }

  async function handleSaveVoice() {
    setSavingVoice(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingVoice(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        brand_voice: brandVoice.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Gagal menyimpan. Coba lagi.");
    } else {
      toast.success("Gaya bicara disimpan.");
    }
    setSavingVoice(false);
  }

  // ── Analisa gaya bicara dari chat WA ──

  async function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    if (!newFiles.length) return;
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
    setExamplesCount(data.examples_count ?? 0);
    setExamplesByCategory(data.examples_by_category ?? {});
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
      const { data, error } = await supabase
        .from("profiles")
        .select("conversation_examples")
        .eq("id", user.id)
        .single();
      if (error) {
        toast.error("Gagal menyimpan gaya komunikasi.");
      } else {
        toast.success("Gaya komunikasi berhasil disimpan.");
        if (Array.isArray(data?.conversation_examples)) {
          setConversationExamples(data.conversation_examples as ConversationExample[]);
        }
      }
    }
    setExamplesCount(0);
    setExamplesByCategory({});
  }

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
      <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-enter">
        <div className="space-y-1.5 mb-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)] gap-8">
          <div className="space-y-2 hidden lg:block">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-10 w-full rounded-lg lg:hidden" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const isAiPane = aiPanes.includes(activePane);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-enter">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Setiap kartu punya tombol simpannya sendiri — perubahan tidak tersimpan sebelum kamu klik.
        </p>
      </div>

      {/* Status */}
      {profile && !profile.onboarding_complete && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Lengkapi koneksi WhatsApp</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              Scan QR di bagian Koneksi WhatsApp untuk mulai menggunakan Glim.{" "}
              <button type="button" className="underline underline-offset-2 font-medium" onClick={() => switchPane("whatsapp")}>
                Buka Koneksi WhatsApp
              </button>
            </p>
          </div>
        </div>
      )}
      {profile?.onboarding_complete && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Glim aktif dan siap digunakan.</p>
        </div>
      )}

      {/* Mobile: chip nav, horizontal scroll */}
      <div className="lg:hidden -mx-6 px-6 mb-6 overflow-x-auto scrollbar-thin">
        <div className="flex gap-1.5 w-max pb-1">
          {navGroups.flatMap((g) => g.items).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchPane(id)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors",
                activePane === id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)] gap-8 items-start">
        {/* Desktop: grouped category nav */}
        <nav className="hidden lg:block sticky top-8 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2.5 pb-1.5">
                {group.label}
              </p>
              {group.items.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchPane(id)}
                  className={cn(
                    "block w-full text-left px-2.5 py-1.5 text-[12.5px] border-l-2 transition-colors duration-150",
                    activePane === id
                      ? "border-primary text-primary font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground font-normal"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Active pane. AI panes get the persistent test panel on xl. */}
        <div
          className={cn(
            "min-w-0",
            isAiPane && "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_290px] gap-6 items-start"
          )}
        >
          <div className="min-w-0 space-y-6">
            {activePane === "profil" && (
              <form onSubmit={handleSaveProfile} className="rounded-xl border border-border bg-card p-5 space-y-5">
                <div>
                  <h2 className="font-display font-semibold text-sm">Profil Bisnis</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nama ini dipakai AI saat memperkenalkan bisnismu ke pelanggan.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-sm font-medium">Nama Bisnis</Label>
                  <Input
                    id="businessName"
                    placeholder="Contoh: Studio Foto Melati"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="flex justify-end pt-1 border-t border-border">
                  <Button type="submit" className="font-display font-medium" disabled={savingProfile}>
                    {savingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Nama Bisnis"}
                  </Button>
                </div>
              </form>
            )}

            {activePane === "whatsapp" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <WhatsAppSection
                  initialNotificationNumber={profile?.notification_wa_number}
                  onNotificationSaved={(number) => setProfile((prev) => prev ? { ...prev, notification_wa_number: number } : prev)}
                />
              </div>
            )}

            {activePane === "impor" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <ImportDataSection />
              </div>
            )}

            {activePane === "akun" && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display font-semibold text-sm text-red-600 dark:text-red-400">Hapus Akun</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Menghapus akun ikut menghapus semua data bisnis, klien, pesanan, dan percakapan. Permanen — tidak bisa dipulihkan.
                    </p>
                  </div>
                  <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                    <DialogTrigger render={<Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 shrink-0"><Trash2 className="w-3 h-3 mr-1.5" />Hapus Akun</Button>} />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Hapus Akun</DialogTitle>
                        <DialogDescription>
                          Semua data bisnis, klien, pesanan, dan percakapan akan dihapus permanen. Tidak ada cara mengembalikannya.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="deleteConfirm" className="text-sm font-medium">
                          Ketik <span className="font-bold text-red-600">HAPUS</span> untuk konfirmasi
                        </Label>
                        <Input
                          id="deleteConfirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="HAPUS"
                          className="h-9 text-sm"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText(""); }}
                        >
                          Batal
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white"
                          disabled={deleteConfirmText !== "HAPUS" || deleteLoading}
                          onClick={async () => {
                            setDeleteLoading(true)
                            // TODO: implement deletion logic via API route
                            toast.error('Fungsi hapus akun belum terhubung ke database. Lihat phase.md.')
                            setDeleteLoading(false)
                            setDeleteModalOpen(false)
                            setDeleteConfirmText('')
                          }}
                        >
                          {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Ya, Hapus Akun Saya
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

            {activePane === "voice" && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display font-semibold text-sm">Gaya Bicara</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cara AI menyapa dan membalas pelanggan. Tulis manual, atau biarkan AI mempelajarinya dari chat WA kamu.
                    </p>
                  </div>
                  {analyzeStep === "idle" && (
                    <label className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors shrink-0">
                      <Sparkles className="w-3 h-3" />
                      Analisa dari Chat WA
                      <input type="file" accept=".txt" multiple className="hidden" onChange={handleAddFiles} />
                    </label>
                  )}
                </div>

                <Textarea
                  id="brandVoice"
                  placeholder="Contoh: Selalu sapa dengan 'Halo Kak 😊'. Pesan singkat 1-2 kalimat. Gunakan emoji 🙏 di akhir pesan."
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  rows={4}
                  className="resize-none text-sm"
                />

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
                        <p className="text-xs text-muted-foreground">AI mempelajari gaya balas dari nama yang kamu pilih. Balasan dari nama itu disimpan sebagai contoh percakapan.</p>
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

                    {examplesCount > 0 && (
                      <div className="rounded-lg border border-border bg-background p-3 space-y-2.5">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs font-medium">AI berhasil mempelajari {examplesCount} contoh percakapan nyata</p>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(examplesByCategory).map(([cat, count]) => {
                            const labels: Record<string, string> = {
                              harga: "Pertanyaan harga",
                              jadwal: "Jadwal & fitting",
                              status: "Status pesanan",
                              pembayaran: "Pembayaran",
                              ketersediaan: "Ketersediaan",
                              umum: "Umum",
                            };
                            const maxCount = Math.max(...Object.values(examplesByCategory));
                            const barWidth = Math.round((count / maxCount) * 100);
                            return (
                              <div key={cat} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-36 shrink-0">{labels[cat] ?? cat}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${barWidth}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-14 text-right">{count} contoh</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button type="button" size="sm" className="h-8 text-xs" onClick={handleUseVoice}>Gunakan Gaya Ini</Button>
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAnalyzeStep("building")}><RefreshCcw className="w-3 h-3 mr-1" /> Analisa Ulang</Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setBrandVoice(brandVoicePreview); setAnalyzeStep("idle"); }}>Edit Manual</Button>
                    </div>
                  </div>
                )}

                {conversationExamples.length > 0 && analyzeStep === "idle" && (
                  <div className="rounded-lg border border-border bg-muted/10">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowExamples((v) => !v)}
                    >
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" />
                        Contoh percakapan yang dipelajari AI ({conversationExamples.length})
                      </span>
                      {showExamples ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showExamples && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                        {conversationExamples.map((ex, i) => {
                          const categoryLabels: Record<string, string> = {
                            harga: "harga", jadwal: "jadwal", status: "status",
                            pembayaran: "bayar", ketersediaan: "stok", umum: "umum",
                          };
                          return (
                            <div key={i} className="text-xs space-y-0.5">
                              <span className="inline-block rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                                {categoryLabels[ex.category] ?? ex.category}
                              </span>
                              <p className="text-muted-foreground line-clamp-1">
                                <span className="font-medium">Pelanggan:</span> {ex.customer}
                              </p>
                              <p className="line-clamp-1">
                                <span className="font-medium">Admin:</span> {ex.admin}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-1 border-t border-border">
                  <Button type="button" className="font-display font-medium" onClick={handleSaveVoice} disabled={savingVoice}>
                    {savingVoice ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Gaya Bicara"}
                  </Button>
                </div>
              </div>
            )}

            {activePane === "pengetahuan" && (
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

            {activePane === "eskalasi" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <AIRulesSection
                  initialKeywords={escalationKeywords}
                  initialLevel={autoReplyLevel}
                  feedbackCount={feedbackCount}
                  hasAnalyzedVoice={conversationExamples.length > 0}
                  onSave={(keywords) => setEscalationKeywords(keywords)}
                />
              </div>
            )}

            {activePane === "template" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <TemplatesSection />
              </div>
            )}
          </div>

          {/* Coba Draft — always visible while tuning the AI */}
          {isAiPane && (
            <aside className="xl:sticky xl:top-8 rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" /> Coba Draft AI
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Kirim pesan contoh, lihat balasan AI dengan pengaturan yang aktif sekarang. Tidak terkirim ke siapa pun.
                </p>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="kak mau tanya harga baju seragam 50 pcs"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTestDraft(); } }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs w-full"
                  onClick={handleTestDraft}
                  disabled={draftLoading || !testMessage.trim()}
                >
                  {draftLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buat Draft"}
                </Button>
              </div>
              {draftResult && (
                <div className="text-xs p-2.5 rounded-lg bg-muted/40 border border-border leading-relaxed">
                  {draftResult}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Draft memakai gaya bicara yang tersimpan — simpan dulu perubahanmu sebelum menguji.
              </p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
