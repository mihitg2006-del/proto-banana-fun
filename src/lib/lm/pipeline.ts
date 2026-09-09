import { extractFields } from "./extract";
import { runComplianceCheck, computeScore, statusFromChecks } from "@/services/complianceEngine";
import { detectCategory } from "@/services/categoryDetection";
import { loadRules } from "./rules";
import { preprocessImage, runOcr, type OcrWord, type PreprocessResult } from "./ocr";
import { nextInspectionId, saveInspection } from "./store";
import type { Inspection, LabelRegion } from "./types";
import type { ExtractedField, FieldKey } from "./types";

export const STEPS = [
  "Uploading image",
  "Enhancing image",
  "Running OCR",
  "Extracting information",
  "Applying compliance rules",
  "Generating compliance result",
] as const;

export interface PipelineInput {
  imageDataUrl: string;
  source: "upload" | "camera" | "sample";
  sampleId?: string | undefined;
  /** Predefined text used in demo mode or as an OCR fallback. */
  fallbackText?: string | undefined;
  fallbackConfidence?: number | undefined;
  useDemoText?: boolean | undefined;
}

export interface PipelineOutput {
  inspection: Inspection;
  preprocess: PreprocessResult;
  words: OcrWord[];
  engineNote: string;
}

const REGION_GROUPS: Array<{ key: string; label: string; fields: FieldKey[] }> = [
  { key: "product", label: "Product information", fields: ["product_name", "brand"] },
  { key: "mrp", label: "MRP", fields: ["mrp"] },
  { key: "quantity", label: "Quantity", fields: ["net_quantity", "unit"] },
  { key: "manufacturer", label: "Manufacturer details", fields: ["manufacturer_name", "manufacturer_address", "packer_name", "importer_name"] },
  { key: "care", label: "Consumer care", fields: ["care_phone", "care_email"] },
  { key: "dates", label: "Dates & batch", fields: ["mfg_date", "expiry_date", "batch_no"] },
];

const FALLBACK_BOXES: Record<string, { x: number; y: number; w: number; h: number }> = {
  product: { x: 0.06, y: 0.06, w: 0.6, h: 0.16 },
  mrp: { x: 0.62, y: 0.08, w: 0.32, h: 0.14 },
  quantity: { x: 0.06, y: 0.3, w: 0.4, h: 0.12 },
  manufacturer: { x: 0.06, y: 0.46, w: 0.66, h: 0.18 },
  care: { x: 0.06, y: 0.68, w: 0.5, h: 0.12 },
  dates: { x: 0.6, y: 0.66, w: 0.34, h: 0.16 },
};

function buildRegions(fields: ExtractedField[], words: OcrWord[]): LabelRegion[] {
  return REGION_GROUPS.map((group) => {
    const groupFields = fields.filter((f) => group.fields.includes(f.key));
    const detected = groupFields.filter((f) => f.present);
    const avgConf = detected.length ? detected.reduce((s, f) => s + f.confidence, 0) / detected.length : 0;
    const state: LabelRegion["state"] =
      detected.length === 0 ? "red" : detected.length < groupFields.length || avgConf < 70 ? "yellow" : "green";

    // Prefer real OCR bounding boxes for the detected values.
    let box = FALLBACK_BOXES[group.key] ?? { x: 0.05, y: 0.05, w: 0.9, h: 0.1 };
    const tokens = detected
      .flatMap((f) => (f.value ?? "").split(/\s+/))
      .map((t) => t.replace(/[^\w₹.@/-]/g, "").toLowerCase())
      .filter((t) => t.length > 2);
    const matched = words.filter((w) => tokens.some((t) => w.text.toLowerCase().includes(t)));
    if (matched.length) {
      const x0 = Math.min(...matched.map((w) => w.bbox.x0));
      const y0 = Math.min(...matched.map((w) => w.bbox.y0));
      const x1 = Math.max(...matched.map((w) => w.bbox.x1));
      const y1 = Math.max(...matched.map((w) => w.bbox.y1));
      box = { x: x0, y: y0, w: Math.max(0.04, x1 - x0), h: Math.max(0.03, y1 - y0) };
    }

    const note =
      detected.length === 0
        ? `No ${group.label.toLowerCase()} detected in this region`
        : `${detected.map((f) => f.label).join(", ")} detected (avg ${Math.round(avgConf)}% confidence)`;

    return { key: group.key, label: group.label, state, box, note };
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runPipeline(
  input: PipelineInput,
  onStep: (index: number, detail?: string) => void,
): Promise<PipelineOutput> {
  onStep(0);
  await wait(350);

  onStep(1);
  const preprocess = await preprocessImage(input.imageDataUrl);
  await wait(300);

  onStep(2, "Initialising OCR engine");
  let text = "";
  let confidence = 0;
  let words: OcrWord[] = [];
  let engineNote = "";

  if (input.useDemoText && input.fallbackText) {
    text = input.fallbackText;
    confidence = input.fallbackConfidence ?? 90;
    engineNote = "Demo mode — predefined sample label text used instead of live OCR.";
    await wait(600);
  } else {
    try {
      const ocr = await runOcr(preprocess.enhanced, (p) => onStep(2, `Recognising text… ${p}%`));
      text = ocr.text;
      confidence = ocr.confidence;
      words = ocr.words;
      engineNote = `Tesseract OCR (browser WASM) · ${words.length} word regions detected.`;
      if (text.replace(/\s/g, "").length < 20 && input.fallbackText) {
        text = input.fallbackText;
        confidence = input.fallbackConfidence ?? 80;
        engineNote = "OCR returned too little text — fell back to predefined sample data so the workflow continues.";
      }
    } catch {
      text = input.fallbackText ?? "";
      confidence = input.fallbackConfidence ?? 0;
      engineNote = "OCR engine unavailable — fallback text used.";
    }
  }

  onStep(3);
  const extraction = extractFields(text, confidence);
  await wait(400);

  onStep(4);
  const rules = loadRules();
  const detectedName = extraction.fields.find((f) => f.key === "product_name")?.value ?? null;
  const cat = detectCategory(detectedName, text);
  const checks = runComplianceCheck(extraction, cat.category, rules, cat.confidence);
  await wait(400);

  onStep(5);
  const score = computeScore(checks, confidence, extraction.fields);
  const status = statusFromChecks(checks, score.total);
  const productName =
    extraction.fields.find((f) => f.key === "product_name")?.value ?? "Unidentified commodity";

  const inspection: Inspection = {
    id: nextInspectionId(),
    createdAt: new Date().toISOString(),
    productName,
    imageDataUrl: preprocess.enhanced,
    rawText: text,
    ocrConfidence: confidence,
    source: input.source,
    sampleId: input.sampleId,
    fields: extraction.fields,
    checks,
    score,
    status,
    regions: buildRegions(extraction.fields, words),
    notes: "",
    category: cat.category,
    categoryConfidence: cat.confidence,
    categoryVerificationRequired: cat.verificationRequired,
  };
  saveInspection(inspection);
  await wait(250);

  return { inspection, preprocess, words, engineNote };
}
