"use client";

import { useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  FileScan,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { readableSize } from "@/lib/attachments";
import { scanPdf, type ScanResult } from "@/lib/pdf-scanner";
import { computeBreakdown } from "@/lib/commission-rules";
import { cn } from "@/lib/cn";

type Props = {
  /** Called with the scan result when the user accepts the auto-fill. */
  onApply: (result: ScanResult) => void;
};

export function PdfScanCard({ onApply }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const toast = useToast();

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("PDF only", "The auto-scanner only handles PDF files.");
      return;
    }
    setScanning(true);
    try {
      const r = await scanPdf(file);
      setResult(r);
    } catch (err) {
      console.error(err);
      toast.error("Could not scan", "Try a different file or fill the form manually.");
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function apply() {
    if (!result) return;
    onApply(result);
    toast.success("Auto-filled from scan", "Review the values and submit.");
    setResult(null);
  }

  if (result) {
    return <ScanReview result={result} onApply={apply} onDismiss={() => setResult(null)} />;
  }

  if (scanning) {
    return (
      <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-indigo-50 p-5 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div className="mt-3 text-sm font-semibold text-slate-900">Scanning PDF…</div>
        <div className="mt-1 text-xs text-slate-500">
          Pulling out the sale amount, client, and product details.
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
          handleFile(e.dataTransfer.files[0]);
        }
      }}
      className={cn(
        "relative rounded-xl border-2 border-dashed p-5 text-center transition-colors",
        dragOver ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-slate-50/60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
        }}
      />
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-200">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900">
        Auto-fill from a quote PDF
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Drag a quote, invoice, or signed contract here — the system will extract
        the sale amount, client, and products.
      </div>
      <button
        type="button"
        className="btn-secondary mt-4"
        onClick={() => inputRef.current?.click()}
      >
        <FileScan className="h-4 w-4" />
        Choose a PDF
      </button>
    </div>
  );
}

function ScanReview({
  result,
  onApply,
  onDismiss,
}: {
  result: ScanResult;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const breakdown = computeBreakdown({
    description: result.description,
    notes: null,
    saleAmount: result.saleAmount,
  });
  const tone = {
    high: { label: "High confidence", className: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
    medium: { label: "Medium confidence", className: "bg-amber-100 text-amber-800 ring-amber-200" },
    low: { label: "Low confidence", className: "bg-red-100 text-red-800 ring-red-200" },
    mock: { label: "Estimate (no text layer)", className: "bg-slate-200 text-slate-700 ring-slate-300" },
  }[result.confidence];

  return (
    <div className="space-y-3 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50/70 to-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              Scan complete
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
                  tone.className
                )}
              >
                <ShieldCheck className="h-2.5 w-2.5" />
                {tone.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              <FileText className="mr-0.5 inline h-3 w-3" />
              {result.attachment.name} · {readableSize(result.attachment.size)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-lg bg-white p-3 ring-1 ring-slate-100">
        <ScanField label="Sale amount" value={`₱${result.saleAmount.toLocaleString("en-PH")}`} highlight />
        <ScanField label="Client" value={result.clientName} />
        <ScanField
          label="Description"
          value={result.description}
          full
        />
        {result.detectedKeywords.length > 0 && (
          <div className="col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Detected
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {result.detectedKeywords.map((k) => (
                <span
                  key={k}
                  className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700 ring-1 ring-brand-100"
                >
                  {k.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </dl>

      <div className="rounded-lg bg-white p-3 text-xs ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Estimated commission (system-computed)
          </span>
          <span className="text-[11px] text-slate-500 tabular-nums">
            {(breakdown.effectiveRate * 100).toFixed(1)}% effective
          </span>
        </div>
        <div className="mt-1 text-base font-semibold tabular-nums text-emerald-700">
          ₱{Math.round(breakdown.total).toLocaleString("en-PH")}
        </div>
      </div>

      {result.confidence !== "high" && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 ring-1 ring-amber-100">
          <TriangleAlert className="h-3.5 w-3.5 flex-none mt-0.5" />
          <span>
            {result.confidence === "mock"
              ? "This PDF has no extractable text layer. The values above are an estimate — please double-check before submitting."
              : "Low / medium confidence. Verify the values are correct before submitting."}
          </span>
        </div>
      )}

      <button type="button" className="btn-primary w-full" onClick={onApply}>
        <CheckCircle2 className="h-4 w-4" />
        Use these values
      </button>
    </div>
  );
}

function ScanField({
  label,
  value,
  full,
  highlight,
}: {
  label: string;
  value: string;
  full?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={cn(full && "col-span-2")}>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 truncate text-sm",
          highlight
            ? "font-bold tabular-nums text-slate-900"
            : "font-medium text-slate-800"
        )}
      >
        {value}
      </div>
    </div>
  );
}
