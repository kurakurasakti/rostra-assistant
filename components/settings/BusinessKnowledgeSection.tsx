"use client";

import { useState, useMemo } from "react";
import { calculateCompleteness } from "@/lib/business-knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type {
  BusinessKnowledgeStructured,
  CompletenessResult,
} from "@/types";

type Step = "input" | "result" | "wizard";
type InputMode = "upload" | "free" | "paste";
type FileProcessingState = "idle" | "reading" | "converting" | "ready";

interface UploadedCatalog {
  name: string;
  mode: "text" | "vision";
  rawText?: string;
  images?: Array<{ base64: string; mimeType: string }>;
}

const WIZARD_QUESTIONS = [
  {
    id: "business_type",
    question: "Bisnis kamu bergerak di bidang apa?",
    placeholder:
      "Contoh: tailor gaun pengantin, bakery, fotografer pernikahan",
  },
  {
    id: "services_and_price",
    question: "Apa saja layanan atau produk kamu dan kisaran harganya?",
    placeholder: "Contoh: Gaun pengantin custom 2-5jt, Kebaya 750rb-2jt",
  },
  {
    id: "operating_info",
    question: "Jam buka dan lokasi bisnis kamu?",
    placeholder: "Contoh: Senin-Sabtu 9-17 WIB, di Jakarta Selatan",
  },
  {
    id: "payment",
    question: "Metode pembayaran apa yang kamu terima?",
    placeholder: "Contoh: Transfer BCA, GoPay, OVO, tunai",
  },
  {
    id: "po_and_notes",
    question: "Ada info lain yang penting untuk pelanggan? (PO, promo, dll)",
    placeholder:
      "Contoh: Saat ini open PO sampai akhir Januari. Konsultasi gratis.",
  },
];

interface Props {
  initialRaw?: string | null;
  initialStructured?: BusinessKnowledgeStructured | null;
  onSave?: (raw: string, structured: BusinessKnowledgeStructured) => void;
}

export default function BusinessKnowledgeSection({
  initialRaw,
  initialStructured,
  onSave,
}: Props) {
  const [step, setStep] = useState<Step>(
    initialRaw ? "result" : "input",
  );
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [rawText, setRawText] = useState(initialRaw ?? "");
  const [uploadedCatalog, setUploadedCatalog] = useState<UploadedCatalog | null>(null);
  const [fileProcessing, setFileProcessing] = useState<FileProcessingState>("idle");
  const [structured, setStructured] = useState<BusinessKnowledgeStructured>(
    initialStructured ?? {
      services: [],
      operating_hours: null,
      location: null,
      payment_methods: [],
      po_status: false,
      po_close_date: null,
      special_notes: null,
    },
  );
  const completeness = useMemo(() => {
    return calculateCompleteness(structured);
  }, [structured]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Wizard state
  const [wizardAnswers, setWizardAnswers] = useState<Record<string, string>>(
    {},
  );
  const [currentWizardStep, setCurrentWizardStep] = useState(0);

  // Payment method tag input
  const [paymentInput, setPaymentInput] = useState("");

  async function extractPdfText(file: File): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist");
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: unknown) => ("str" in (item as object) ? (item as { str: string }).str : "")).join(" ") + "\n";
    }
    return text.trim();
  }

  async function pdfToImages(file: File, maxPages = 3): Promise<Array<{ base64: string; mimeType: string }>> {
    const pdfjsLib = await import("pdfjs-dist");
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const count = Math.min(pdf.numPages, maxPages);
    const images: Array<{ base64: string; mimeType: string }> = [];
    for (let i = 1; i <= count; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      images.push({ base64, mimeType: "image/jpeg" });
    }
    return images;
  }

  async function imageFileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({ base64: dataUrl.split(",")[1], mimeType: file.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      toast.error("Format tidak didukung. Upload PDF, JPG, PNG, atau WEBP.");
      return;
    }

    setUploadedCatalog(null);
    setFileProcessing("reading");

    try {
      if (isPdf) {
        const text = await extractPdfText(file);
        if (text.length > 100) {
          setUploadedCatalog({ name: file.name, mode: "text", rawText: text });
          setFileProcessing("ready");
        } else {
          setFileProcessing("converting");
          const images = await pdfToImages(file);
          setUploadedCatalog({ name: file.name, mode: "vision", images });
          setFileProcessing("ready");
        }
      } else {
        const img = await imageFileToBase64(file);
        setUploadedCatalog({ name: file.name, mode: "vision", images: [img] });
        setFileProcessing("ready");
      }
    } catch {
      toast.error("Gagal membaca file. Coba lagi atau gunakan opsi Paste.");
      setFileProcessing("idle");
    }
  }

  async function runExtraction(text?: string, images?: Array<{ base64: string; mimeType: string }>) {
    setIsExtracting(true);
    try {
      const body = images ? { images } : { raw_text: text };
      const res = await fetch("/api/settings/extract-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error ?? "Gagal menganalisa. Coba lagi.");
        setIsExtracting(false);
        return;
      }

      setStructured(data.structured);

      setStep("result");
    } catch {
      toast.error("Gagal menghubungi server. Coba lagi.");
    }
    setIsExtracting(false);
  }

  async function handleAnalyze() {
    if (inputMode === "upload") {
      if (!uploadedCatalog) {
        toast.error("Upload file katalog dulu.");
        return;
      }
      if (uploadedCatalog.mode === "text") {
        setRawText(uploadedCatalog.rawText!);
        await runExtraction(uploadedCatalog.rawText!);
      } else {
        await runExtraction(undefined, uploadedCatalog.images!);
      }
      return;
    }
    if (!rawText.trim() || rawText.trim().length < 20) {
      toast.error("Ceritakan lebih detail tentang bisnismu.");
      return;
    }
    await runExtraction(rawText);
  }

  async function handleWizardFinish() {
    const compiledRaw = WIZARD_QUESTIONS.map(
      (q) => `${q.question}\n${wizardAnswers[q.id] ?? ""}`,
    ).join("\n\n");
    setRawText(compiledRaw);
    await runExtraction(compiledRaw);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/save-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText, structured }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error ?? "Gagal menyimpan.");
      } else {
        toast.success("Pengetahuan bisnis tersimpan ✓ AI siap menjawab");
        onSave?.(rawText, structured);
      }
    } catch {
      toast.error("Gagal menghubungi server.");
    }
    setIsSaving(false);
  }

  function updateService(
    idx: number,
    field: keyof BusinessKnowledgeStructured["services"][0],
    value: string,
  ) {
    setStructured((prev) => {
      const services = [...prev.services];
      services[idx] = { ...services[idx], [field]: value };
      return { ...prev, services };
    });
  }

  function removeService(idx: number) {
    setStructured((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== idx),
    }));
  }

  function addService() {
    setStructured((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        { name: "", price_range: "", description: "" },
      ],
    }));
  }

  function addPaymentMethod() {
    const val = paymentInput.trim();
    if (!val) return;
    if (!structured.payment_methods.includes(val)) {
      setStructured((prev) => ({
        ...prev,
        payment_methods: [...prev.payment_methods, val],
      }));
    }
    setPaymentInput("");
  }

  function removePaymentMethod(method: string) {
    setStructured((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.filter((m) => m !== method),
    }));
  }

  // ─── STEP: input ───────────────────────────────────────────────────────────

  if (step === "input") {
    return (
      <div className="space-y-5 border-t border-border pt-5 mt-5">
        <div>
          <h2 className="font-display font-semibold text-sm">
            Pengetahuan Bisnis
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bantu AI memahami bisnis kamu.
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              inputMode === "upload"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📎 Upload File
          </button>
          <button
            type="button"
            onClick={() => setInputMode("free")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              inputMode === "free"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ✏️ Ceritakan
          </button>
          <button
            type="button"
            onClick={() => setInputMode("paste")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              inputMode === "paste"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Paste
          </button>
        </div>

        {inputMode === "upload" && (
          <div className="space-y-3">
            {fileProcessing === "idle" && !uploadedCatalog && (
              <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 cursor-pointer hover:bg-muted/40 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Upload katalog atau price list</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG, WEBP · Max 10MB</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            )}

            {(fileProcessing === "reading" || fileProcessing === "converting") && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {fileProcessing === "reading" ? "Membaca file..." : "Mengkonversi ke gambar (PDF tidak ada teks)..."}
                </p>
              </div>
            )}

            {fileProcessing === "ready" && uploadedCatalog && (
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  {uploadedCatalog.mode === "text"
                    ? <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  }
                  <span className="text-sm font-medium flex-1 truncate">{uploadedCatalog.name}</span>
                  <button
                    type="button"
                    onClick={() => { setUploadedCatalog(null); setFileProcessing("idle"); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {uploadedCatalog.mode === "text"
                    ? `✓ Teks terdeteksi (${uploadedCatalog.rawText?.length.toLocaleString()} karakter) — analisa teks`
                    : `🖼️ PDF gambar / foto katalog — analisa dengan AI Vision`
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {(inputMode === "free" || inputMode === "paste") && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {inputMode === "free"
                ? "Ceritakan bisnis kamu"
                : "Paste teks broadcast/pricelist WA kamu"}
            </Label>
            <Textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                inputMode === "free"
                  ? "Contoh: Saya punya bisnis tailor gaun pengantin dan kebaya di Jakarta Selatan. Harga mulai 750rb sampai 5jt tergantung model dan bahan. Buka Senin-Sabtu jam 9 pagi sampai 5 sore. Minimal DP 50%, terima BCA dan GoPay."
                  : "Paste teks yang biasa kamu kirim ke pelanggan, atau isi dari katalog WA kamu"
              }
              className="resize-none text-sm"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleAnalyze}
            disabled={
              isExtracting ||
              (inputMode === "upload" ? fileProcessing !== "ready" : !rawText.trim())
            }
            className="gap-1.5"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                AI sedang membaca bisnis kamu...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Analisa dengan AI
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => {
              setStep("wizard");
              setCurrentWizardStep(0);
              setWizardAnswers({});
            }}
          >
            Saya bingung →
          </Button>
        </div>
      </div>
    );
  }

  // ─── STEP: wizard ──────────────────────────────────────────────────────────

  if (step === "wizard") {
    const q = WIZARD_QUESTIONS[currentWizardStep];
    const progress = ((currentWizardStep + 1) / WIZARD_QUESTIONS.length) * 100;
    const isLast = currentWizardStep === WIZARD_QUESTIONS.length - 1;

    return (
      <div className="space-y-5 border-t border-border pt-5 mt-5">
        <div>
          <h2 className="font-display font-semibold text-sm">
            Pengetahuan Bisnis
          </h2>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Pertanyaan {currentWizardStep + 1} dari {WIZARD_QUESTIONS.length}
            </p>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <p className="text-sm font-medium">{q.question}</p>

          <Textarea
            rows={3}
            value={wizardAnswers[q.id] ?? ""}
            onChange={(e) =>
              setWizardAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
            }
            placeholder={q.placeholder}
            className="resize-none text-sm"
          />

          <div className="flex items-center gap-2">
            {currentWizardStep > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setCurrentWizardStep((s) => s - 1)}
              >
                <ChevronLeft className="w-3 h-3" />
                Kembali
              </Button>
            )}
            {!isLast ? (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setCurrentWizardStep((s) => s + 1)}
              >
                Lanjut
                <ChevronRight className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleWizardFinish}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI menganalisa...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Selesai & Analisa
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground ml-auto"
              onClick={() => {
                setStep("input");
                setWizardAnswers({});
                setCurrentWizardStep(0);
              }}
            >
              Batal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: result ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 border-t border-border pt-5 mt-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-sm">
            Pengetahuan Bisnis
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Edit hasil analisa AI, lalu simpan.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-medium">AI berhasil memahami bisnis kamu</span>
        </div>
      </div>

      {/* Completeness warning */}
      {completeness && completeness.missing.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Field belum terisi — lengkapi di bawah:
            </p>
            <ul className="mt-1 space-y-0.5">
              {completeness.missing.map((m) => (
                <li
                  key={m}
                  className="text-xs text-amber-600/80 dark:text-amber-400/70"
                >
                  • {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Services table */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Produk & Layanan</Label>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                  Nama
                </th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                  Kisaran Harga
                </th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                  Keterangan
                </th>
                <th className="w-8 py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {structured.services.map((svc, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-muted/30">
                  <td className="py-2 px-2">
                    <Input
                      value={svc.name}
                      onChange={(e) => updateService(idx, "name", e.target.value)}
                      placeholder="Gaun kebaya custom"
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      value={svc.price_range}
                      onChange={(e) =>
                        updateService(idx, "price_range", e.target.value)
                      }
                      placeholder="750rb – 2.5jt"
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      value={svc.description ?? ""}
                      onChange={(e) =>
                        updateService(idx, "description", e.target.value)
                      }
                      placeholder="tergantung model"
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeService(idx)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={addService}
        >
          <Plus className="w-3 h-3" />
          Tambah Produk
        </Button>
      </div>

      {/* Operational info */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Info Operasional</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Jam Operasional
            </Label>
            <Input
              value={structured.operating_hours ?? ""}
              onChange={(e) =>
                setStructured((prev) => ({
                  ...prev,
                  operating_hours: e.target.value || null,
                }))
              }
              placeholder="Senin–Sabtu, 09:00–17:00 WIB"
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Lokasi/Alamat
            </Label>
            <Input
              value={structured.location ?? ""}
              onChange={(e) =>
                setStructured((prev) => ({
                  ...prev,
                  location: e.target.value || null,
                }))
              }
              placeholder="Jalan Merdeka no. 123, Jakarta"
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Metode Pembayaran</Label>
        <div className="flex flex-wrap gap-2">
          {structured.payment_methods.map((m) => (
            <div
              key={m}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              {m}
              <button
                type="button"
                onClick={() => removePaymentMethod(m)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={paymentInput}
            onChange={(e) => setPaymentInput(e.target.value)}
            placeholder="Tambah metode, contoh: BCA"
            className="h-8 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPaymentMethod();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs px-3"
            onClick={addPaymentMethod}
          >
            Tambah
          </Button>
        </div>
      </div>

      {/* PO status */}
      <div className="space-y-2.5">
        <Label className="text-sm font-medium">Status PO</Label>
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Open PO</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={structured.po_status ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() =>
                setStructured((prev) => ({ ...prev, po_status: true }))
              }
            >
              Ya
            </Button>
            <Button
              type="button"
              variant={!structured.po_status ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() =>
                setStructured((prev) => ({
                  ...prev,
                  po_status: false,
                  po_close_date: null,
                }))
              }
            >
              Tidak
            </Button>
          </div>
        </div>
        {structured.po_status && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              PO Tutup Tanggal
            </Label>
            <Input
              type="date"
              value={structured.po_close_date ?? ""}
              onChange={(e) =>
                setStructured((prev) => ({
                  ...prev,
                  po_close_date: e.target.value || null,
                }))
              }
              className="h-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* Special notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Catatan Khusus</Label>
        <Textarea
          value={structured.special_notes ?? ""}
          onChange={(e) =>
            setStructured((prev) => ({
              ...prev,
              special_notes: e.target.value || null,
            }))
          }
          placeholder="Libur lebaran 1–7 April"
          rows={2}
          className="resize-none text-xs"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-muted-foreground"
          onClick={() => {
            setStep("input");
          }}
        >
          <RotateCcw className="w-3 h-3" />
          Ulangi
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs gap-1.5 ml-auto"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3" />
              Simpan Pengetahuan Bisnis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
