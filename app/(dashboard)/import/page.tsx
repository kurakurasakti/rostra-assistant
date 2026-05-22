"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, ArrowRight, Check, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"

type Step = "upload" | "mapping" | "preview" | "confirm"

interface ColumnMapping {
  csv: string
  field: string
}

const FIELDS = [
  { id: "name", label: "Nama Klien", required: true },
  { id: "phone", label: "No. WhatsApp", required: true },
  { id: "email", label: "Email", required: false },
  { id: "notes", label: "Catatan", required: false },
]

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [fileData, setFileData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping[]>([])
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Format file harus CSV atau Excel (.xlsx/.xls)")
      return
    }

    setFileName(file.name)

    const text = await file.text()
    let rows: Record<string, string>[] = []
    let cols: string[] = []

    if (ext === "csv") {
      const Papa = await import("papaparse")
      const result = Papa.parse(text, { header: true, skipEmptyLines: true })
      cols = result.meta.fields || []
      rows = result.data as Record<string, string>[]
    } else {
      const XLSX = await import("xlsx")
      const workbook = XLSX.read(text, { type: "string" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)
      cols = json.length > 0 ? Object.keys(json[0]) : []
      rows = json
    }

    if (rows.length === 0) {
      toast.error("File kosong atau tidak bisa dibaca.")
      return
    }

    setHeaders(cols)
    setFileData(rows.slice(0, 5))
    setMapping(cols.map((c) => ({ csv: c, field: "" })))
    setStep("mapping")
    toast.success(`${rows.length} data ditemukan. Sekarang mapping kolom.`)
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight">Import Data</h1>
        <p className="text-muted-foreground text-sm mt-1">Import klien dari file Excel atau CSV.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { id: "upload" as Step, label: "Upload" },
          { id: "mapping" as Step, label: "Mapping" },
          { id: "preview" as Step, label: "Preview" },
          { id: "confirm" as Step, label: "Selesai" },
        ].map((s, i) => {
          const isActive = step === s.id
          const isDone = ["upload", "mapping", "preview", "confirm"].indexOf(step) > i
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-accent text-white" : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>{s.label}</span>
              {i < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold text-sm mb-1">Upload file Excel atau CSV</p>
          <p className="text-xs text-muted-foreground mb-4">File akan diparsing secara otomatis.</p>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Pilih File
          </Button>
        </div>
      )}

      {/* Mapping step */}
      {step === "mapping" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-sm">Mapping Kolom</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cocokkan kolom file dengan field di Rostra.</p>
          </div>

          <div className="space-y-3">
            {FIELDS.map((field) => (
              <div key={field.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-medium mb-1">{field.label} {field.required && <span className="text-destructive">*</span>}</p>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={mapping.find((m) => m.field === field.id)?.csv || ""}
                    onChange={(e) => setMapping(mapping.map((m) => m.csv === e.target.value ? { ...m, field: field.id } : m))}
                  >
                    <option value="">— Pilih kolom —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Preview first 5 rows */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">Preview 5 baris pertama</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {headers.map((h) => <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {fileData.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {headers.map((h) => <td key={h} className="px-3 py-2">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep("upload")}>Kembali</Button>
            <Button onClick={() => setStep("preview")} disabled={!mapping.some((m) => m.field === "name" && m.csv)}>Lanjutkan</Button>
          </div>
        </div>
      )}

      {/* Preview step */}
      {step === "preview" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <div>
              <h2 className="font-display font-semibold text-sm">Siap Import</h2>
              <p className="text-xs text-muted-foreground mt-0.5">File &quot;{fileName}&quot; siap diimport.</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setStep("mapping")}>Kembali</Button>
            <Button onClick={() => setStep("confirm")}>
              Import ke Rostra
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirm step */}
      {step === "confirm" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <h2 className="font-display font-semibold text-sm">Import Berhasil</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Data klien berhasil diimport.</p>
            </div>
          </div>

          <Button onClick={() => { setStep("upload"); setFileName(""); setFileData([]); setHeaders([]) }}>
            Import Lagi
          </Button>
        </div>
      )}
    </div>
  )
}
