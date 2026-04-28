"use client";

/**
 * Browser-side PDF scanner. Tries to extract real text from text-based PDFs
 * via pdfjs-dist; falls back to a plausible mock so the demo always works,
 * even when given an image-only/scanned PDF.
 *
 * For production, swap this for a server-side call to an LLM with vision
 * (Claude Sonnet, GPT-4o) — handles any PDF format reliably.
 */

import type { Attachment } from "./types";
import { fileToAttachment } from "./attachments";

export type ExtractionConfidence = "high" | "medium" | "low" | "mock";

export type ScanResult = {
  saleAmount: number;
  clientName: string;
  description: string;
  detectedKeywords: string[];
  confidence: ExtractionConfidence;
  rawTextSnippet: string; // first ~200 chars of extracted text, for the UI
  attachment: Attachment;
};

// Lazy-load pdfjs only when needed; avoids dragging the worker into
// every page bundle.
type PdfJsModule = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = (async () => {
    const mod = await import("pdfjs-dist");
    // Worker file shipped on a CDN keyed to the installed version
    mod.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.version}/pdf.worker.min.js`;
    return mod;
  })();
  return pdfjsPromise;
}

async function extractText(file: File): Promise<string> {
  try {
    const pdfjs = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const chunks: string[] = [];
    const maxPages = Math.min(doc.numPages, 10);
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i);
      const text = await page.getTextContent();
      const line = text.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ");
      chunks.push(line);
    }
    await doc.destroy();
    return chunks.join("\n");
  } catch {
    return "";
  }
}

// ─── Heuristics ───────────────────────────────────────────────────────────

const CURRENCY_PATTERNS: RegExp[] = [
  // ₱ or PHP/Php prefixed
  /(?:₱|PHP|Php|P\s)\s*([\d]{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/g,
  // suffixed ("123,456 PHP", "1,200,000 pesos")
  /([\d]{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)\s*(?:PHP|Php|pesos?)/gi,
  // dollar prefixed (in case they pull a USD quote)
  /\$\s*([\d]{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/g,
  // bare large numbers near "total", "subtotal", "amount due"
  /(?:total|subtotal|amount\s*(?:due|payable))[^\d]{0,20}([\d]{1,3}(?:[,\s]\d{3})+(?:\.\d{1,2})?)/gi,
];

function findAmounts(text: string): number[] {
  const out = new Set<number>();
  for (const pattern of CURRENCY_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const n = parseFloat(m[1].replace(/[,\s]/g, ""));
      // Plausible solar deal range: ₱1k – ₱10M
      if (Number.isFinite(n) && n >= 1000 && n <= 10_000_000) {
        out.add(n);
      }
    }
  }
  return Array.from(out).sort((a, b) => b - a);
}

const KEYWORDS: Record<string, RegExp> = {
  rooftop: /\brooftop\b/i,
  ground_mount: /\bground[-\s]?mount/i,
  battery: /\b(battery|powerwall|backup\s*power|enphase|tesla)\b/i,
  inverter: /\binverter\b/i,
  monitoring: /\bmonitoring\b/i,
  net_metering: /\bnet[-\s]?metering\b/i,
  consultation: /\b(consultation|site\s*survey|assessment)\b/i,
  maintenance: /\b(maintenance|cleaning|inspection)\b/i,
  commercial: /\bcommercial\b/i,
  residential: /\bresidential\b/i,
};

function detectKeywords(text: string): string[] {
  const found: string[] = [];
  for (const [tag, re] of Object.entries(KEYWORDS)) {
    if (re.test(text)) found.push(tag);
  }
  return found;
}

const KW_PATTERN = /\b(\d{1,3}(?:\.\d{1,2})?)\s*(?:kW|kw|kilowatt)/i;
function detectSystemSize(text: string): number | null {
  const m = text.match(KW_PATTERN);
  if (!m) return null;
  const kw = parseFloat(m[1]);
  return Number.isFinite(kw) ? kw : null;
}

const CLIENT_NAME_PATTERNS: RegExp[] = [
  /(?:client|customer|bill\s*to|prepared\s*for)\s*[:\-]?\s*([A-Z][\w&'\-\.]*(?:\s+[A-Z][\w&'\-\.]*){0,4})/m,
  /(?:Mr\.?|Mrs\.?|Ms\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
];

function detectClientName(text: string): string | null {
  for (const re of CLIENT_NAME_PATTERNS) {
    const m = text.match(re);
    if (m && m[1] && m[1].length >= 3 && m[1].length <= 60) {
      return m[1].trim();
    }
  }
  return null;
}

// ─── Mock fallback ────────────────────────────────────────────────────────

function plausibleMockFromFile(file: File): ScanResult {
  // Seed pseudo-random output from filename so repeat scans of the same
  // mock file produce the same numbers (more demo-friendly).
  let seed = 0;
  for (let i = 0; i < file.name.length; i++) seed = (seed * 31 + file.name.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const sizes = [4, 5, 6, 8, 10, 12, 15, 20];
  const kw = sizes[Math.floor(rand() * sizes.length)];
  // ~₱45k–60k per kW for residential, more for commercial/battery
  const ratePerKw = 45000 + Math.floor(rand() * 15000);
  const hasBattery = rand() > 0.6;
  const batteryAddon = hasBattery ? 250000 + Math.floor(rand() * 200000) : 0;
  const saleAmount = kw * ratePerKw + batteryAddon;

  const clients = [
    "The Reyes Family",
    "Sunrise Daycare Center",
    "Greenleaf Grocers",
    "Maple Ridge HOA",
    "Bayview Logistics",
    "Pinecrest Lodge",
    "The Garcia Household",
  ];
  const clientName = clients[Math.floor(rand() * clients.length)];

  const detectedKeywords = ["rooftop", "residential"];
  if (hasBattery) detectedKeywords.push("battery");
  if (kw >= 20) {
    detectedKeywords.push("commercial");
    detectedKeywords.splice(detectedKeywords.indexOf("residential"), 1);
  }

  const description = hasBattery
    ? `${kw}kW rooftop solar + battery backup`
    : `${kw}kW rooftop solar install`;

  return {
    saleAmount,
    clientName,
    description,
    detectedKeywords,
    confidence: "mock",
    rawTextSnippet: "(no text layer found in PDF — using a plausible estimate)",
    attachment: null as unknown as Attachment, // filled in by scanPdf
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function scanPdf(file: File): Promise<ScanResult> {
  const attachment = await fileToAttachment(file);
  const text = await extractText(file);
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length < 30) {
    // Image-only PDF or extraction failed — fall back to plausible mock
    const mock = plausibleMockFromFile(file);
    return { ...mock, attachment };
  }

  const amounts = findAmounts(cleaned);
  const keywords = detectKeywords(cleaned);
  const systemSize = detectSystemSize(cleaned);
  const clientName =
    detectClientName(cleaned) ?? plausibleMockFromFile(file).clientName;

  // The largest plausible amount is almost always the total
  const saleAmount =
    amounts[0] ?? plausibleMockFromFile(file).saleAmount;

  const description = systemSize
    ? `${systemSize}kW solar system${keywords.includes("battery") ? " + battery backup" : ""}`
    : keywords.includes("commercial")
    ? "Commercial solar installation"
    : keywords.includes("maintenance")
    ? "Maintenance & inspection"
    : keywords.includes("consultation")
    ? "Solar consultation"
    : "Solar system installation";

  let confidence: ExtractionConfidence;
  if (amounts.length > 0 && (keywords.length > 0 || systemSize !== null)) {
    confidence = "high";
  } else if (amounts.length > 0) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    saleAmount,
    clientName,
    description,
    detectedKeywords: keywords,
    confidence,
    rawTextSnippet: cleaned.slice(0, 220),
    attachment,
  };
}
