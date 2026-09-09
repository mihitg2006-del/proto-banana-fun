export type FieldKey =
  | "product_name"
  | "brand"
  | "manufacturer_name"
  | "manufacturer_address"
  | "packer_name"
  | "importer_name"
  | "country_of_origin"
  | "net_quantity"
  | "mrp"
  | "mfg_date"
  | "expiry_date"
  | "care_phone"
  | "care_email"
  | "batch_no"
  | "unit";

export interface ExtractedField {
  key: FieldKey;
  label: string;
  value: string | null;
  present: boolean;
  /** 0-100 */
  confidence: number;
  source: string | null;
  note?: string;
}

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type ValidationType = "presence" | "format" | "consistency" | "sanity";

export interface Rule {
  rule_id: string;
  field: FieldKey | "multiple";
  requirement: string;
  severity: Severity;
  validation_type: ValidationType;
  enabled: boolean;
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  rule_id: string;
  requirement: string;
  field: string;
  severity: Severity;
  validation_type: ValidationType;
  status: CheckStatus;
  why: string;
  evidence: string;
  action: string;
}

export interface ScoreBreakdown {
  declarations: number; // out of 60
  formatting: number; // out of 20
  readability: number; // out of 10
  other: number; // out of 10
  total: number; // 0-100
}

export interface Inspection {
  id: string;
  createdAt: string;
  productName: string;
  imageDataUrl: string | null;
  rawText: string;
  ocrConfidence: number;
  source: "upload" | "camera" | "sample";
  sampleId?: string;
  fields: ExtractedField[];
  checks: CheckResult[];
  score: ScoreBreakdown;
  status: "Compliant" | "Non-Compliant" | "Needs Review";
  regions: LabelRegion[];
  notes: string;
}

export interface LabelRegion {
  key: string;
  label: string;
  state: "green" | "yellow" | "red";
  /** normalised 0-1 box */
  box: { x: number; y: number; w: number; h: number };
  note: string;
}
