import type { ExtractedField, FieldKey } from "./types";

export const FIELD_LABELS: Record<FieldKey, string> = {
  product_name: "Product Name",
  brand: "Brand",
  manufacturer_name: "Manufacturer Name",
  manufacturer_address: "Manufacturer Address",
  packer_name: "Packer Name",
  importer_name: "Importer Name",
  country_of_origin: "Country of Origin",
  net_quantity: "Net Quantity",
  mrp: "MRP",
  mfg_date: "Manufacturing / Packing Date",
  expiry_date: "Expiry / Best Before",
  care_phone: "Consumer Care Number",
  care_email: "Consumer Care Email / Website",
  batch_no: "Batch / Lot Number",
  unit: "Unit of Measurement",
};

export interface MrpAnalysis {
  hasLabel: boolean;
  currency: string | null;
  value: number | null;
  raw: string | null;
  candidates: string[];
  wellFormatted: boolean;
  inclusiveOfTaxes: boolean;
  issues: string[];
}

export interface QuantityAnalysis {
  raw: string | null;
  number: number | null;
  unit: string | null;
  normalizedUnit: string | null;
  /** grams or millilitres or pieces */
  normalizedValue: number | null;
  standardUnit: boolean;
  issues: string[];
}

export interface ExtractionResult {
  fields: ExtractedField[];
  mrp: MrpAnalysis;
  quantity: QuantityAnalysis;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function lines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => clean(l))
    .filter(Boolean);
}

function mk(
  key: FieldKey,
  value: string | null,
  confidence: number,
  source: string | null,
  note?: string,
): ExtractedField {
  return {
    key,
    label: FIELD_LABELS[key],
    value: value ? clean(value) : null,
    present: Boolean(value),
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
    source: source ? clean(source) : null,
    note,
  };
}

function findLine(ls: string[], re: RegExp) {
  return ls.find((l) => re.test(l)) ?? null;
}

/** Confidence blends OCR quality with pattern/keyword strength. */
function conf(ocr: number, pattern: number, keyword: boolean) {
  const base = 0.45 * ocr + 0.4 * pattern + (keyword ? 15 : 0);
  return Math.min(99, base);
}

export function analyseMrp(text: string, ls: string[]): MrpAnalysis {
  const issues: string[] = [];
  const hasLabel = /\b(m\.?r\.?p\.?|maximum retail price)\b/i.test(text);
  const re = /(?:m\.?r\.?p\.?|maximum retail price|price)[^0-9₹rs]*(₹|rs\.?|inr)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) candidates.push(clean(m[0]));

  const first = candidates[0] ?? null;
  const numMatch = first?.match(/([0-9]+(?:[.,][0-9]{1,2})?)/);
  const value = numMatch ? Number(numMatch[1].replace(",", ".")) : null;
  const currency = first ? (first.match(/₹|rs\.?|inr/i)?.[0] ?? null) : null;
  const inclusiveOfTaxes = /incl(usive)?\.? of all taxes/i.test(text);

  if (!hasLabel) issues.push("No 'MRP' / 'Maximum Retail Price' label found in the extracted text.");
  if (!value) issues.push("No readable numeric price value could be extracted.");
  if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 100000))
    issues.push(`Price value ${value} looks implausible for a packaged commodity.`);
  if (value !== null && !currency) issues.push("Currency symbol (₹ / Rs. / INR) was not detected next to the price.");
  if (!inclusiveOfTaxes && value !== null)
    issues.push("'Inclusive of all taxes' style declaration was not detected.");

  const uniqueValues = Array.from(
    new Set(
      candidates
        .map((c) => c.match(/([0-9]+(?:[.,][0-9]{1,2})?)/)?.[1])
        .filter(Boolean) as string[],
    ),
  );
  if (uniqueValues.length > 1)
    issues.push(`Multiple conflicting price values detected: ${uniqueValues.join(", ")}.`);

  const priceLine = findLine(ls, /m\.?r\.?p|maximum retail price/i);
  void priceLine;

  return {
    hasLabel,
    currency,
    value,
    raw: first,
    candidates,
    wellFormatted: Boolean(hasLabel && value && currency && uniqueValues.length === 1),
    inclusiveOfTaxes,
    issues,
  };
}

const UNIT_MAP: Record<string, { norm: string; factor: number }> = {
  g: { norm: "g", factor: 1 },
  gm: { norm: "g", factor: 1 },
  gms: { norm: "g", factor: 1 },
  gram: { norm: "g", factor: 1 },
  grams: { norm: "g", factor: 1 },
  kg: { norm: "g", factor: 1000 },
  mg: { norm: "g", factor: 0.001 },
  ml: { norm: "ml", factor: 1 },
  l: { norm: "ml", factor: 1000 },
  ltr: { norm: "ml", factor: 1000 },
  litre: { norm: "ml", factor: 1000 },
  n: { norm: "pcs", factor: 1 },
  pcs: { norm: "pcs", factor: 1 },
  pieces: { norm: "pcs", factor: 1 },
};

export function analyseQuantity(text: string, ls: string[]): QuantityAnalysis {
  const issues: string[] = [];
  const qtyLine =
    findLine(ls, /net\s*(qty|quantity|wt|weight|vol|volume)/i) ?? findLine(ls, /\b\d+\s*(g|kg|ml|l)\b/i);
  const scope = qtyLine ?? text;
  const m = scope.match(/(\d+(?:[.,]\d+)?)\s*(mg|kg|gms|gm|grams|gram|g|ml|ltr|litre|l|pcs|pieces|n)\b/i);

  if (!qtyLine && !m) {
    issues.push("No net quantity declaration could be located in the extracted text.");
    return {
      raw: null,
      number: null,
      unit: null,
      normalizedUnit: null,
      normalizedValue: null,
      standardUnit: false,
      issues,
    };
  }

  if (!m) {
    issues.push("A quantity keyword was found but the number/unit pair could not be parsed.");
    return {
      raw: qtyLine,
      number: null,
      unit: null,
      normalizedUnit: null,
      normalizedValue: null,
      standardUnit: false,
      issues,
    };
  }

  const number = Number(m[1].replace(",", "."));
  const unitRaw = m[2].toLowerCase();
  const mapped = UNIT_MAP[unitRaw];
  if (!mapped) issues.push(`Unit "${unitRaw}" is not a recognised standard unit.`);
  if (!Number.isFinite(number) || number <= 0) issues.push("Quantity number looks invalid.");
  if (mapped && mapped.norm !== "pcs" && number * mapped.factor > 50000)
    issues.push("Declared quantity looks implausibly large for a retail package.");
  if (/net\s*(wt|weight)/i.test(scope) && mapped?.norm === "ml")
    issues.push("Net weight is declared with a volume unit — unit/measure mismatch.");

  return {
    raw: clean(m[0]),
    number,
    unit: unitRaw,
    normalizedUnit: mapped?.norm ?? null,
    normalizedValue: mapped ? number * mapped.factor : null,
    standardUnit: Boolean(mapped),
    issues,
  };
}

export function extractFields(rawText: string, ocrConfidence: number): ExtractionResult {
  const text = rawText.replace(/\u20b9/g, "₹");
  const ls = lines(text);
  const mrp = analyseMrp(text, ls);
  const quantity = analyseQuantity(text, ls);
  const fields: ExtractedField[] = [];

  // Product name: explicit label, else the longest of the first 3 lines.
  const nameLine = findLine(ls, /^(product|name)\s*[:\-]/i);
  const guessName = ls.slice(0, 3).sort((a, b) => b.length - a.length)[0] ?? null;
  const productName = nameLine ? nameLine.replace(/^(product|name)\s*[:\-]\s*/i, "") : guessName;
  fields.push(
    mk("product_name", productName, conf(ocrConfidence, nameLine ? 92 : 62, Boolean(nameLine)), nameLine ?? guessName),
  );

  const brandLine = findLine(ls, /^brand\s*[:\-]/i);
  const brand = brandLine ? brandLine.replace(/^brand\s*[:\-]\s*/i, "") : (ls[0] ?? null);
  fields.push(mk("brand", brand, conf(ocrConfidence, brandLine ? 90 : 55, Boolean(brandLine)), brandLine ?? ls[0] ?? null));

  const mfgLine = findLine(ls, /(manufactured|marketed|mfd)\s*(by|&\s*packed by)|manufacturer\s*[:\-]/i);
  const mfgName = mfgLine
    ? mfgLine.replace(/.*?(by|manufacturer)\s*[:\-]?\s*/i, "").split(",")[0]
    : null;
  fields.push(mk("manufacturer_name", mfgName, conf(ocrConfidence, mfgLine ? 93 : 0, Boolean(mfgLine)), mfgLine));

  // Address: a line containing a PIN code, or a long comma-rich line after the manufacturer line.
  const pinLine = findLine(ls, /\b\d{6}\b/);
  const addrLine =
    pinLine ?? ls.find((l) => (l.match(/,/g) ?? []).length >= 2 && /road|street|industrial|plot|dist|nagar|estate/i.test(l)) ?? null;
  fields.push(
    mk(
      "manufacturer_address",
      addrLine,
      conf(ocrConfidence, addrLine ? (pinLine ? 95 : 70) : 0, Boolean(addrLine)),
      addrLine,
      addrLine ? undefined : "No address pattern (PIN code / street tokens) detected",
    ),
  );

  const packerLine = findLine(ls, /packed by|packer\s*[:\-]/i);
  const packer = packerLine ? packerLine.replace(/.*?(packed by|packer)\s*[:\-]?\s*/i, "") : null;
  fields.push(mk("packer_name", packer, conf(ocrConfidence, packerLine ? 90 : 0, Boolean(packerLine)), packerLine));

  const impLine = findLine(ls, /imported by|importer\s*[:\-]/i);
  const importer = impLine ? impLine.replace(/.*?(imported by|importer)\s*[:\-]?\s*/i, "") : null;
  fields.push(mk("importer_name", importer, conf(ocrConfidence, impLine ? 90 : 0, Boolean(impLine)), impLine));

  const cooLine = findLine(ls, /country of origin/i);
  const coo = cooLine ? cooLine.replace(/.*country of origin\s*[:\-]?\s*/i, "") : null;
  fields.push(mk("country_of_origin", coo, conf(ocrConfidence, cooLine ? 94 : 0, Boolean(cooLine)), cooLine));

  fields.push(
    mk(
      "net_quantity",
      quantity.raw,
      conf(ocrConfidence, quantity.raw ? (quantity.standardUnit ? 94 : 60) : 0, Boolean(quantity.raw)),
      findLine(ls, /net\s*(qty|quantity|wt|weight|vol)/i) ?? quantity.raw,
      quantity.issues[0],
    ),
  );

  fields.push(
    mk(
      "unit",
      quantity.unit ? (quantity.normalizedUnit ?? quantity.unit) : null,
      conf(ocrConfidence, quantity.standardUnit ? 92 : quantity.unit ? 50 : 0, quantity.standardUnit),
      quantity.raw,
      quantity.standardUnit ? undefined : "Unit not recognised as standard",
    ),
  );

  fields.push(
    mk(
      "mrp",
      mrp.raw,
      conf(ocrConfidence, mrp.wellFormatted ? 96 : mrp.raw ? 65 : 0, mrp.hasLabel),
      findLine(ls, /m\.?r\.?p|maximum retail price/i),
      mrp.issues[0],
    ),
  );

  const mfgDateLine = findLine(ls, /(mfg|manufactur\w*|packed|pkd)\s*(date|on)?\s*[:\-]|date of (manufacture|packing)/i);
  const mfgDate = mfgDateLine ? (mfgDateLine.match(/([0-9]{1,2}[\/.-])?[0-9]{1,2}[\/.-][0-9]{2,4}|[A-Za-z]{3,9}\s*[0-9]{4}/)?.[0] ?? null) : null;
  fields.push(mk("mfg_date", mfgDate, conf(ocrConfidence, mfgDate ? 93 : 0, Boolean(mfgDateLine)), mfgDateLine));

  const expLine = findLine(ls, /best before|use by|exp(iry)?\b/i);
  const expiry = expLine ? clean(expLine.replace(/^.*?(best before|use by|expiry|exp)\s*[:\-]?\s*/i, "")) : null;
  fields.push(mk("expiry_date", expiry || null, conf(ocrConfidence, expiry ? 92 : 0, Boolean(expLine)), expLine));

  const phoneLine = findLine(ls, /(consumer|customer)\s*(care|complaints?)|toll\s*free|\b1800[\s-]?\d/i);
  const phone = (phoneLine ?? text).match(/(\+?91[\s-]?)?(1800[\s-]?\d{3}[\s-]?\d{3,4}|\d{10})/)?.[0] ?? null;
  fields.push(mk("care_phone", phone, conf(ocrConfidence, phone ? 95 : 0, Boolean(phoneLine)), phoneLine));

  const emailOrSite =
    text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/)?.[0] ??
    text.match(/(www\.[\w-]+\.[\w.]{2,}|https?:\/\/[\w./-]+)/i)?.[0] ??
    null;
  fields.push(
    mk("care_email", emailOrSite, conf(ocrConfidence, emailOrSite ? 96 : 0, Boolean(emailOrSite)), emailOrSite),
  );

  const batchLine = findLine(ls, /batch|lot\s*(no|number)?|b\.?no/i);
  const batch = batchLine ? (batchLine.match(/[:\-]\s*([A-Z0-9\-\/]{3,})/i)?.[1] ?? null) : null;
  fields.push(mk("batch_no", batch, conf(ocrConfidence, batch ? 93 : 0, Boolean(batchLine)), batchLine));

  return { fields, mrp, quantity };
}
