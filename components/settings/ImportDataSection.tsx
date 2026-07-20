"use client"

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  SkipForward,
  Upload,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  type ColMapping,
  extractMappedRows,
  type ImportResult,
  suggestMapping,
} from "@/lib/importer"

type Step = "upload" | "mapping" | "preview" | "confirm"

const FIELDS: { id: keyof ColMapping; label: string; required: boolean }[] = [
  { id: "name", label: "Nama Klien", required: true },
  { id: "phone", label: "No. WhatsApp", required: true },
  { id: "email", label: "Email", required: false },
  { id: "notes", label: "Catatan", required: false },
]

const STEP_ORDER: Step[] = ["upload", "mapping", "preview", "confirm"]

export default function ImportDataSection() {
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [allRows, setAllRows] = useState<Record<string, string>[]>([])
  const [colMapping, setColMapping] = useState<ColMapping>({
    name: "",
    phone: "",
    email: "",
    notes: "",
  })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      toast.error("Format file harus CSV atau Excel (.xlsx/.xls)")
      return
    }

    let rows: Record<string, string>[] = []
    let cols: string[] = []

    try {
      if (ext === "csv") {
        const Papa = await import("papaparse")
        const result = Papa.parse(await file.text(), { header: true, skipEmptyLines: true })
        cols = result.meta.fields ?? []
        rows = result.data as Record<string, string>[]
      } else {
        const XLSX = await import("xlsx")
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer)
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })
        cols = rows.length > 0 ? Object.keys(rows[0]) : []
      }
    } catch {
      toast.error("Gagal membaca file. Pastikan format valid.")
      return
    }

    if (rows.length === 0) {
      toast.error("File kosong atau tidak bisa dibaca.")
      return
    }

    setFileName(file.name)
    setHeaders(cols)
    setAllRows(rows)
    setPreviewRows(rows.slice(0, 8))

    const suggested = suggestMapping(cols)
    setColMapping({
      name: suggested.name ?? "",
      phone: suggested.phone ?? "",
      email: suggested.email ?? "",
      notes: suggested.notes ?? "",
    })

    setStep("mapping")
  }

  async function handleImport() {
    setImporting(true)
    try {
      const rows = extractMappedRows(allRows, colMapping)
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data: ImportResult = await res.json()
      if (!res.ok) {
        toast.error((data as unknown as { error: string }).error ?? "Gagal import")
        return
      }
      setResult(data)
      setStep("confirm")
    } catch {
      toast.error("Gagal menghubungi server.")
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep("upload")
    setFileName("")
    setHeaders([])
    setAllRows([])
    setPreviewRows([])
    setColMapping({ name: "", phone: "", email: "", notes: "" })
    setResult(null)
  }

  const currentIdx = STEP_ORDER.indexOf(step)
  const requiredMapped = colMapping.name && colMapping.phone

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-sm">Impor Data Client</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Import Client dari file Excel atau CSV.
          {allRows.length > 0 && (
            <span className="text-foreground font-medium"> {allRows.length} baris terdeteksi.</span>
          )}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {(
          [
            { id: "upload", label: "Upload" },
            { id: "mapping", label: "Mapping" },
            { id: "preview", label: "Preview" },
            { id: "confirm", label: "Selesai" },
          ] as { id: Step; label: string }[]
        ).map((s, i) => {
          const isActive = step === s.id
          const isDone = currentIdx > i
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span
                className={`text-xs ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
              {i < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file && fileInputRef.current) {
              const dt = new DataTransfer()
              dt.items.add(file)
              fileInputRef.current.files = dt.files
              fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }))
            }
          }}
        >
          <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold text-sm mb-1">Upload file Excel atau CSV</p>
          <p className="text-xs text-muted-foreground mb-4">
            Drag & drop atau klik untuk pilih file (.xlsx, .xls, .csv · maks 5MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-2" />
            Pilih File
          </Button>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && (
        <div className="space-y-4 animate-enter">
          <div className="space-y-3">
            {FIELDS.map((field) => (
              <div key={field.id} className="grid grid-cols-2 items-center gap-3">
                <p className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </p>
                <select
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={colMapping[field.id]}
                  onChange={(e) =>
                    setColMapping((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                >
                  <option value="">— Tidak dipetakan —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {previewRows.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                Preview {previewRows.length} baris pertama
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap"
                        >
                          {h}
                          {h === colMapping.name && (
                            <span className="ml-1 text-primary">← Nama</span>
                          )}
                          {h === colMapping.phone && (
                            <span className="ml-1 text-primary">← WA</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {headers.map((h) => (
                          <td
                            key={h}
                            className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[160px] truncate"
                          >
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1 border-t border-border">
            <Button variant="outline" size="sm" onClick={reset}>
              Ganti File
            </Button>
            <Button size="sm" onClick={() => setStep("preview")} disabled={!requiredMapped}>
              Lanjutkan <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-4 animate-enter">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">Total baris</p>
              <p className="font-display font-bold text-xl mt-0.5">{allRows.length}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">File</p>
              <p className="font-medium text-sm mt-0.5 truncate">{fileName}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Mapping yang digunakan</p>
            {FIELDS.filter((f) => colMapping[f.id]).map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-24 flex-shrink-0">{f.label}</span>
                <span className="text-foreground font-medium">← {colMapping[f.id]}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              Contoh data yang akan diimport
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Nama</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                    No. WhatsApp
                  </th>
                  {colMapping.email && (
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Email</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {allRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {row[colMapping.name] || <span className="text-destructive">—</span>}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row[colMapping.phone] || <span className="text-destructive">—</span>}
                    </td>
                    {colMapping.email && (
                      <td className="px-3 py-2 text-muted-foreground">{row[colMapping.email]}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {allRows.length > 5 && (
              <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                +{allRows.length - 5} baris lainnya...
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-1 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setStep("mapping")}>
              Kembali
            </Button>
            <Button size="sm" onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  Import ke Glim <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === "confirm" && result && (
        <div className="space-y-4 animate-enter">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-medium">Import dari &quot;{fileName}&quot; selesai.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-center">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
              <p className="font-display font-bold text-2xl text-emerald-700 dark:text-emerald-400">
                {result.imported}
              </p>
              <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
                Berhasil
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-center">
              <SkipForward className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
              <p className="font-display font-bold text-2xl text-amber-700 dark:text-amber-400">
                {result.duplicates}
              </p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">Duplikat</p>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-center">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
              <p className="font-display font-bold text-2xl text-red-700 dark:text-red-400">
                {result.skipped}
              </p>
              <p className="text-xs text-red-700/70 dark:text-red-400/70 mt-0.5">Dilewati</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Baris yang dilewati ({result.errors.length})
                </p>
              </div>
              <div className="divide-y divide-border max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="px-3 py-2 flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground flex-shrink-0 font-mono">
                      Baris {err.row}
                    </span>
                    <span className="text-foreground">{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1 border-t border-border">
            <Button variant="outline" size="sm" onClick={reset}>
              Import Lagi
            </Button>
            {result.imported > 0 && (
              <Link href="/clients">
                <Button size="sm">
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Lihat Daftar Klien
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
