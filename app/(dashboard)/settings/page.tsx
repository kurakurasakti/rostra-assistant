"use client"

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import AIRulesSection from "@/components/settings/AIRulesSection"
import BusinessKnowledgeSection from "@/components/settings/BusinessKnowledgeSection"
import ImportDataSection from "@/components/settings/ImportDataSection"
import InlineEditCard from "@/components/settings/InlineEditCard"
import { SettingsAnchorNav } from "@/components/settings/SettingsAnchorNav"
import TemplatesSection from "@/components/settings/TemplatesSection"
import TonePresetPicker from "@/components/settings/TonePresetPicker"
import WhatsAppSection from "@/components/settings/WhatsAppSection"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { BusinessKnowledgeStructured, ConversationExample, Profile } from "@/types"

type AnalyzeStep = "idle" | "building" | "analyzing" | "preview"

interface UploadedFile {
  name: string
  text: string
  senders: string[]
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined)
  const [waConnectedAt, setWaConnectedAt] = useState<number | undefined>(undefined)

  // Section A state
  const [businessName, setBusinessName] = useState("")
  const [brandVoice, setBrandVoice] = useState("")

  // Brand voice analysis state
  const [analyzeStep, setAnalyzeStep] = useState<AnalyzeStep>("idle")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedSender, setSelectedSender] = useState("")
  const [brandVoicePreview, setBrandVoicePreview] = useState("")
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const addFileInputRef = useRef<HTMLInputElement>(null)

  // Few-shot examples state
  const [examplesCount, setExamplesCount] = useState(0)
  const [examplesByCategory, setExamplesByCategory] = useState<Record<string, number>>({})
  const [conversationExamples, setConversationExamples] = useState<ConversationExample[]>([])
  const [showExamples, setShowExamples] = useState(false)

  const allSenders = [...new Set(uploadedFiles.flatMap((f) => f.senders))]
  const combinedText = uploadedFiles.map((f) => f.text).join("\n")

  // Draft test state
  const [testMessage, setTestMessage] = useState("")
  const [draftResult, setDraftResult] = useState("")
  const [draftLoading, setDraftLoading] = useState(false)

  // Section C: Business Knowledge state
  const [businessKnowledgeRaw, setBusinessKnowledgeRaw] = useState<string | null>(null)
  const [businessKnowledgeStructured, setBusinessKnowledgeStructured] =
    useState<BusinessKnowledgeStructured | null>(null)

  // Section D: Escalation Rules state
  const [escalationKeywords, setEscalationKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [autoReplyLevel, setAutoReplyLevel] = useState(1)
  const [feedbackCount, setFeedbackCount] = useState(0)

  // Danger Zone
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      let activeProfile = data

      if (error && error.code === "PGRST116") {
        console.log("Profile missing, creating default profile for user:", user.id)
        const { data: insertedData, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            business_name: "",
            brand_voice: "Ramah, profesional, dan informatif",
          })
          .select("*")
          .single()

        if (!insertError && insertedData) {
          activeProfile = insertedData
        } else {
          console.error("Failed to auto-create profile:", insertError)
        }
      }

      if (activeProfile) {
        setProfile(activeProfile)
        setBusinessName(activeProfile.business_name ?? "")
        setBrandVoice(activeProfile.brand_voice ?? "")

        // Section C
        setBusinessKnowledgeRaw(activeProfile.business_knowledge_raw ?? null)
        setBusinessKnowledgeStructured(activeProfile.business_knowledge_structured ?? null)

        // Section D
        setEscalationKeywords(
          Array.isArray(activeProfile.escalation_keywords) ? activeProfile.escalation_keywords : [],
        )
        setAutoReplyLevel(activeProfile.auto_reply_level ?? 1)
        setFeedbackCount(activeProfile.feedback_count ?? 0)

        // Conversation examples
        if (
          Array.isArray(activeProfile.conversation_examples) &&
          activeProfile.conversation_examples.length > 0
        ) {
          setConversationExamples(activeProfile.conversation_examples as ConversationExample[])
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.error("[handleSaveProfile] No authenticated user found")
      return
    }

    console.log("[handleSaveProfile] Saving profile for user:", user.id, {
      businessName,
      brandVoice,
      escalationKeywords,
    })

    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: businessName.trim(),
        brand_voice: brandVoice.trim(),
        escalation_keywords: escalationKeywords,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (error) {
      console.error("[handleSaveProfile] Error saving profile:", error)
      toast.error("Gagal menyimpan. Coba lagi.")
    } else {
      console.log("[handleSaveProfile] Profile saved successfully in DB")
      toast.success("Pengaturan berhasil disimpan.")
      setLastSavedAt(Date.now())
    }
    setSaving(false)
  }

  // --- Brand voice analysis ---

  async function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? [])
    if (!newFiles.length) return
    // Reset input so same file can be re-added after removal
    e.target.value = ""
    setAnalyzeLoading(true)

    const formData = new FormData()
    newFiles.forEach((f) => formData.append("files", f))

    const res = await fetch("/api/settings/analyze-chat", {
      method: "POST",
      body: formData,
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      toast.error(data.error ?? "Gagal membaca file.")
      setAnalyzeLoading(false)
      return
    }

    const texts = await Promise.all(newFiles.map((f) => f.text()))
    const entries: UploadedFile[] = newFiles.map((f, i) => ({
      name: f.name,
      text: texts[i],
      senders: data.senders,
    }))

    setUploadedFiles((prev) => {
      // dedupe by name — re-adding same filename replaces old entry
      const kept = prev.filter((p) => !newFiles.some((f) => f.name === p.name))
      return [...kept, ...entries]
    })
    setAnalyzeStep("building")
    setAnalyzeLoading(false)
  }

  function handleRemoveFile(name: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== name))
  }

  async function handleAnalyzeVoice() {
    if (!selectedSender) return
    setAnalyzeLoading(true)
    setAnalyzeStep("analyzing")

    const res = await fetch("/api/settings/analyze-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: selectedSender,
        file_content: combinedText,
      }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      toast.error(data.error ?? "Gagal menganalisa chat.")
      setAnalyzeStep("building")
      setAnalyzeLoading(false)
      return
    }

    setBrandVoicePreview(data.brand_voice)
    setExamplesCount(data.examples_count ?? 0)
    setExamplesByCategory(data.examples_by_category ?? {})
    setAnalyzeStep("preview")
    setAnalyzeLoading(false)
  }

  async function handleUseVoice() {
    const voice = brandVoicePreview
    console.log("[handleUseVoice] Setting local brandVoice state to preview:", voice)
    setBrandVoice(voice)
    setAnalyzeStep("idle")
    setBrandVoicePreview("")
    setUploadedFiles([])
    setSelectedSender("")

    // Reload conversation_examples from DB (already saved by analyze-voice route)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      console.log("[handleUseVoice] Reloading conversation_examples from DB for user:", user.id)
      const { data, error } = await supabase
        .from("profiles")
        .select("conversation_examples")
        .eq("id", user.id)
        .single()
      if (error) {
        console.error("[handleUseVoice] Error loading examples:", error)
        toast.error("Gagal menyimpan gaya komunikasi.")
      } else {
        console.log(
          "[handleUseVoice] Successfully loaded conversation_examples:",
          data?.conversation_examples?.length,
        )
        toast.success("Gaya komunikasi berhasil disimpan.")
        if (Array.isArray(data?.conversation_examples)) {
          setConversationExamples(data.conversation_examples as ConversationExample[])
        }
      }
    }
    setExamplesCount(0)
    setExamplesByCategory({})
  }

  // --- Draft test ---

  async function handleTestDraft() {
    if (!testMessage.trim()) return
    setDraftLoading(true)
    const res = await fetch("/api/messages/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: testMessage, brand_voice: brandVoice }),
    })
    const data = await res.json()
    if (res.ok && data.draft) setDraftResult(data.draft)
    else toast.error("Gagal membuat draft. Pastikan OpenRouter API key sudah diisi.")
    setDraftLoading(false)
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-enter">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,640px)_170px] lg:justify-center gap-8 p-6 lg:p-8 animate-enter">
      <div className="space-y-6">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola profil bisnis dan koneksi WhatsApp.
          </p>
        </div>

        {/* Onboarding banner */}
        {profile && !profile.onboarding_complete && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Lengkapi koneksi WhatsApp
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                Scan QR di tab Koneksi WhatsApp untuk mulai menggunakan Glim.
              </p>
            </div>
          </div>
        )}

        {profile?.onboarding_complete && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Glim aktif dan siap digunakan.
            </p>
          </div>
        )}

        <section id="profile" className="scroll-mt-24">
          <form id="business-form" onSubmit={handleSaveProfile} className="space-y-6">
            <InlineEditCard
              title="Nama Bisnis"
              subtitle="Nama yang akan digunakan AI untuk menyebut bisnis Anda."
              summary={businessName || "Belum diisi"}
              defaultExpanded={!businessName}
              onCollapseRequest={lastSavedAt}
            >
              <div className="space-y-1.5">
                <Label htmlFor="businessName" className="text-sm font-medium">
                  Nama Bisnis
                </Label>
                <Input
                  id="businessName"
                  placeholder="Contoh: Studio Foto Melati"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
            </InlineEditCard>

            <div className="rounded-xl border border-border bg-card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-sm">Gaya Komunikasi AI</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pilih preset atau buat gaya komunikasi kustom Anda.
                  </p>
                </div>
              </div>

              <TonePresetPicker
                value={brandVoice}
                onSelect={(template) => setBrandVoice(template)}
                customSlot={
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="brandVoice"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Gaya Komunikasi AI{" "}
                        <span className="text-muted-foreground font-normal">(opsional)</span>
                      </Label>
                      {analyzeStep === "idle" && (
                        <label className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border border-border">
                          <Sparkles className="w-3 h-3" />
                          Analisa dari Chat WA
                          <input
                            type="file"
                            accept=".txt"
                            multiple
                            className="hidden"
                            onChange={handleAddFiles}
                          />
                        </label>
                      )}
                    </div>

                    <Textarea
                      id="brandVoice"
                      placeholder="Contoh: Selalu sapa dengan 'Halo Kak 😊'. Pesan singkat 1-2 kalimat. Gunakan emoji 🙏 di akhir pesan."
                      value={brandVoice}
                      onChange={(e) => setBrandVoice(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />

                    {/* Analyze flow */}
                    {analyzeStep === "building" && (
                      <div className="rounded-lg border border-border p-4 space-y-4 bg-background">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            File chat ({uploadedFiles.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {uploadedFiles.map((f) => (
                              <div
                                key={f.name}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs"
                              >
                                <span className="max-w-[160px] truncate">{f.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(f.name)}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <label className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/40 cursor-pointer transition-colors">
                              {analyzeLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3" />
                              )}
                              {analyzeLoading ? "Membaca..." : "Tambah File"}
                              <input
                                ref={addFileInputRef}
                                type="file"
                                accept=".txt"
                                multiple
                                className="hidden"
                                onChange={handleAddFiles}
                                disabled={analyzeLoading}
                              />
                            </label>
                          </div>
                        </div>

                        {uploadedFiles.length > 0 && allSenders.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">
                              Siapa nama admin bisnis kamu di chat ini?
                            </p>
                            <Select
                              value={selectedSender}
                              onValueChange={(v) => {
                                if (v) setSelectedSender(v)
                              }}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Pilih nama admin..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allSenders.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              AI akan mempelajari gaya balas pesan dari nama yang kamu pilih.
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={handleAnalyzeVoice}
                            disabled={
                              !selectedSender || uploadedFiles.length === 0 || analyzeLoading
                            }
                          >
                            <Sparkles className="w-3 h-3 mr-1.5" /> Analisa Gaya Chat
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setAnalyzeStep("idle")
                              setUploadedFiles([])
                              setSelectedSender("")
                            }}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    )}

                    {analyzeStep === "analyzing" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> AI sedang mempelajari gaya chat
                        kamu...
                      </div>
                    )}

                    {analyzeStep === "preview" && (
                      <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                        <p className="text-xs font-medium">Hasil analisa:</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {brandVoicePreview}
                        </p>

                        {examplesCount > 0 && (
                          <div className="rounded-lg border border-border bg-background p-3 space-y-2.5">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                              <p className="text-xs font-medium">
                                AI berhasil mempelajari {examplesCount} contoh percakapan nyata
                              </p>
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
                                }
                                const maxCount = Math.max(...Object.values(examplesByCategory))
                                const barWidth = Math.round((count / maxCount) * 100)
                                return (
                                  <div key={cat} className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-36 shrink-0">
                                      {labels[cat] ?? cat}
                                    </span>
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary/60 rounded-full"
                                        style={{ width: `${barWidth}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-14 text-right">
                                      {count} contoh
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              AI akan lebih akurat menjawab pertanyaan spesifik bisnis kamu
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={handleUseVoice}
                          >
                            Gunakan Gaya Ini
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setAnalyzeStep("building")}
                          >
                            <RefreshCcw className="w-3 h-3 mr-1" /> Analisa Ulang
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setBrandVoice(brandVoicePreview)
                              setAnalyzeStep("idle")
                            }}
                          >
                            Edit Manual
                          </Button>
                        </div>
                      </div>
                    )}

                    {brandVoice && analyzeStep === "idle" && (
                      <>
                        <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" /> Coba Draft AI
                          </p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="kak mau tanya harga baju seragam 50 pcs"
                              value={testMessage}
                              onChange={(e) => setTestMessage(e.target.value)}
                              className="h-8 text-xs flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleTestDraft()
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs shrink-0"
                              onClick={handleTestDraft}
                              disabled={draftLoading || !testMessage.trim()}
                            >
                              {draftLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Coba"}
                            </Button>
                          </div>
                          {draftResult && (
                            <div className="text-xs p-2 rounded bg-background border border-border text-foreground leading-relaxed">
                              {draftResult}
                            </div>
                          )}
                        </div>

                        {conversationExamples.length > 0 && (
                          <div className="rounded-lg border border-border bg-muted/10">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setShowExamples((v) => !v)}
                            >
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                Lihat contoh percakapan yang dipelajari AI (
                                {conversationExamples.length} contoh)
                              </span>
                              {showExamples ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            {showExamples && (
                              <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                                {conversationExamples.map((ex, i) => {
                                  const categoryLabels: Record<string, string> = {
                                    harga: "harga",
                                    jadwal: "jadwal",
                                    status: "status",
                                    pembayaran: "bayar",
                                    ketersediaan: "stok",
                                    umum: "umum",
                                  }
                                  return (
                                    <div key={i} className="text-xs space-y-0.5">
                                      <span className="inline-block rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                                        {categoryLabels[ex.category] ?? ex.category}
                                      </span>
                                      <p className="text-muted-foreground line-clamp-1">
                                        <span className="font-medium">Pelanggan:</span>{" "}
                                        {ex.customer}
                                      </p>
                                      <p className="line-clamp-1">
                                        <span className="font-medium">Admin:</span> {ex.admin}
                                      </p>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                }
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" className="font-display font-medium" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  "Simpan Profil"
                )}
              </Button>
            </div>
          </form>
        </section>

        <section id="whatsapp" className="scroll-mt-24">
          <InlineEditCard
            title="Sambungan WhatsApp"
            subtitle="Hubungkan nomor WhatsApp bisnis Anda untuk mulai membalas pesan secara otomatis."
            summary={profile?.wa_connected ? "Terhubung ✓" : "Belum terhubung"}
            defaultExpanded={!profile?.wa_connected}
            onCollapseRequest={waConnectedAt}
          >
            <WhatsAppSection
              initialNotificationNumber={profile?.notification_wa_number}
              onNotificationSaved={(number) =>
                setProfile((prev) => (prev ? { ...prev, notification_wa_number: number } : prev))
              }
              onConnected={() => setWaConnectedAt(Date.now())}
            />
          </InlineEditCard>
        </section>

        <section id="business" className="scroll-mt-24">
          <div className="rounded-xl border border-border bg-card p-5">
            <BusinessKnowledgeSection
              initialRaw={businessKnowledgeRaw}
              initialStructured={businessKnowledgeStructured}
              onSave={(raw, structured) => {
                setBusinessKnowledgeRaw(raw)
                setBusinessKnowledgeStructured(structured)
              }}
            />
          </div>
        </section>

        <section id="ai" className="scroll-mt-24 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <AIRulesSection
              initialKeywords={escalationKeywords}
              initialLevel={autoReplyLevel}
              feedbackCount={feedbackCount}
              hasAnalyzedVoice={conversationExamples.length > 0}
              onSave={(keywords) => setEscalationKeywords(keywords)}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <TemplatesSection />
          </div>
        </section>

        <section id="import" className="scroll-mt-24">
          <div className="rounded-xl border border-border bg-card p-5">
            <ImportDataSection />
          </div>
        </section>

        {/* Danger Zone */}
        <section id="danger" className="scroll-mt-24">
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-sm text-red-600 dark:text-red-400">
                  Zona Berbahaya
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tindakan destruktif — harap hati-hati.
                </p>
              </div>
              <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-3 h-3 mr-1.5" />
                      Hapus Akun
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Hapus Akun</DialogTitle>
                    <DialogDescription>
                      Apakah kamu yakin ingin menghapus akun? Semua data bisnis, Client, pesanan,
                      dan percakapan akan dihapus permanen dan tidak bisa dipulihkan.
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
                      onClick={() => {
                        setDeleteModalOpen(false)
                        setDeleteConfirmText("")
                      }}
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
                        // const supabase = createClient()
                        // const { data: { user } } = await supabase.auth.getUser()
                        // await fetch('/api/settings/delete-account', { method: 'POST' })
                        // router.push('/login?deleted=1')
                        toast.error(
                          "Fungsi hapus akun belum terhubung ke database. Lihat phase.md.",
                        )
                        setDeleteLoading(false)
                        setDeleteModalOpen(false)
                        setDeleteConfirmText("")
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
        </section>
      </div>

      <div className="hidden lg:block">
        <SettingsAnchorNav />
      </div>
    </div>
  )
}
