import type {
  CheckResult,
  CheckStatus,
  ExtractedField,
  FieldKey,
  LegalRule,
  ProductCategory,
  RuleStatus,
  ScoreBreakdown,
  Severity,
} from "@/lib/lm/types";
import type { ExtractionResult } from "@/lib/lm/extract";
import { FIELD_LABELS } from "@/lib/lm/extract";

/**
 * Deterministic Legal Metrology rule engine.
 *
 * Reads ONLY the local dataset passed in (src/data/legalMetrologyRules.ts).
 * No fetch(), no remote JSON, no government API at runtime.
 */

const SEVERITY_WEIGHT: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function fieldOf(fields: ExtractedField[], key: FieldKey) {
  return fields.find((f) => f.key === key);
}

function toCheckStatus(s: RuleStatus): CheckStatus {
  if (s === "PASSED") return "pass";
  if (s === "WARNING") return "warn";
  return "fail";
}

function failStatus(severity: Severity): RuleStatus {
  return severity === "Critical" ? "CRITICAL" : "VIOLATION";
}

interface Draft {
  ruleStatus: RuleStatus;
  detectedValue: string | null;
  evidence: string;
  why: string;
  action: string;
  confidence: number; // 0-1
  verificationRequired?: boolean;
}

function build(rule: LegalRule, d: Draft): CheckResult {
  return {
    // legacy shape (dashboard / report / assistant)
    rule_id: rule.id,
    requirement: rule.requirement,
    field: rule.field === "multiple" ? "Multiple declarations" : FIELD_LABELS[rule.field],
    severity: rule.severity,
    validation_type: rule.validationType,
    status: toCheckStatus(d.ruleStatus),
    why: d.why,
    evidence: d.evidence,
    action: d.action,
    // evidence-based metadata
    ruleId: rule.id,
    title: rule.title,
    fieldKey: rule.field,
    detectedValue: d.detectedValue,
    ruleStatus: d.ruleStatus,
    confidence: Math.round(Math.max(0, Math.min(1, d.confidence)) * 100) / 100,
    applicability: rule.applicability,
    source: rule.source,
    sourceUrl: rule.sourceUrl,
    verificationRequired: d.verificationRequired ?? rule.verificationRequired,
    excludeFromScore: rule.excludeFromScore,
  };
}

/** Is this rule applicable to the detected product category? */
function applicable(
  rule: LegalRule,
  category: ProductCategory,
  categoryConfidence: number,
): { applies: boolean; uncertain: boolean; note: string } {
  if (rule.applicability === "general") return { applies: true, uncertain: false, note: "" };

  if (rule.applicability === "verification_required")
    return {
      applies: true,
      uncertain: true,
      note: "Legal applicability of this requirement could not be determined automatically.",
    };

  if (rule.applicability === "category_specific") {
    if (category === "UNKNOWN" || categoryConfidence < 55)
      return {
        applies: true,
        uncertain: true,
        note: `Product category could not be confirmed (detected ${category}, ${Math.round(categoryConfidence)}% confidence).`,
      };
    const list = rule.categories ?? [];
    if (list.length && !list.includes(category))
      return {
        applies: false,
        uncertain: false,
        note: `Not applicable to the detected category (${category}).`,
      };
    return { applies: true, uncertain: false, note: "" };
  }

  // conditional
  return { applies: true, uncertain: true, note: "Applicability depends on the commodity and packaging." };
}

export function runComplianceCheck(
  extraction: ExtractionResult,
  category: ProductCategory,
  rules: LegalRule[],
  categoryConfidence = 100,
): CheckResult[] {
  const { fields, mrp, quantity } = extraction;
  const out: CheckResult[] = [];

  for (const rule of rules) {
    // 1. enabled
    if (!rule.enabled) continue;

    // 2. applicability
    const app = applicable(rule, category, categoryConfidence);
    if (!app.applies) {
      out.push(
        build(rule, {
          ruleStatus: "PASSED",
          detectedValue: null,
          evidence: app.note,
          why: "This requirement was not applied because it is not applicable to the detected product category.",
          action: "No action required unless the inspector determines the commodity falls in another category.",
          confidence: categoryConfidence / 100,
          verificationRequired: false,
        }),
      );
      continue;
    }

    // Advisory / verification-only requirements
    if (rule.applicability === "verification_required") {
      out.push(
        build(rule, {
          ruleStatus: "WARNING",
          detectedValue: null,
          evidence: app.note,
          why: "The prototype cannot decide this requirement automatically; it is flagged for inspector verification.",
          action: "Verify this requirement manually against the official Legal Metrology notification.",
          confidence: 0.3,
          verificationRequired: true,
        }),
      );
      continue;
    }

    // 3/4. field check + validation
    if (rule.validationType === "presence" && rule.field !== "multiple") {
      const f = fieldOf(fields, rule.field);
      let value = f?.value ?? null;
      let evidence = value
        ? `Detected "${value}" in the extracted label text (field confidence ${f?.confidence ?? 0}%).`
        : `No value matching ${FIELD_LABELS[rule.field].toLowerCase()} was detected in the OCR text.`;

      // Manufacturer name/address may equally be satisfied by packer or importer details.
      if (!value && rule.field === "manufacturer_name") {
        const alt = fieldOf(fields, "packer_name")?.value ?? fieldOf(fields, "importer_name")?.value ?? null;
        if (alt) {
          value = alt;
          evidence = `Satisfied by packer / importer declaration: "${alt}".`;
        }
      }

      // Country of origin is only meaningful for imported commodities.
      if (!value && rule.field === "country_of_origin" && !fieldOf(fields, "importer_name")?.value) {
        out.push(
          build(rule, {
            ruleStatus: "WARNING",
            detectedValue: null,
            evidence: "No 'Country of Origin' text detected and no importer declaration detected.",
            why: "Applicability could not be confirmed because the package does not appear to declare an importer.",
            action: "Confirm on the physical package whether the commodity is imported.",
            confidence: 0.4,
            verificationRequired: true,
          }),
        );
        continue;
      }

      const present = Boolean(value);
      const status: RuleStatus = present
        ? app.uncertain
          ? "PASSED"
          : "PASSED"
        : app.uncertain
          ? "WARNING"
          : failStatus(rule.severity);

      out.push(
        build(rule, {
          ruleStatus: status,
          detectedValue: value,
          evidence: app.note ? `${evidence} ${app.note}` : evidence,
          why: present
            ? "The required declaration was located in the extracted label text."
            : app.uncertain
              ? "The declaration was not detected, but applicability to this commodity could not be confirmed."
              : `The required ${FIELD_LABELS[rule.field].toLowerCase()} could not be identified in the scanned label.`,
          action: present
            ? "Spot-check the printed value against the physical package."
            : "Verify the physical package and the applicable legal requirement before recording a violation.",
          confidence: present ? (f?.confidence ?? 70) / 100 : 0.9,
          verificationRequired: rule.verificationRequired || app.uncertain,
        }),
      );
      continue;
    }

    switch (rule.id) {
      // MRP format
      case "LM-PC-008": {
        const ok = mrp.wellFormatted && mrp.inclusiveOfTaxes;
        out.push(
          build(rule, {
            ruleStatus: mrp.value === null ? failStatus(rule.severity) : ok ? "PASSED" : "WARNING",
            detectedValue: mrp.raw,
            evidence: mrp.raw
              ? `${mrp.raw}${mrp.issues.length ? " — " + mrp.issues.join(" ") : ""}`
              : "No MRP pattern (₹ / Rs. / M.R.P. / Maximum Retail Price) detected.",
            why:
              mrp.value === null
                ? "No price value could be parsed, so its formatting could not be validated."
                : ok
                  ? "The price is printed with a currency indicator and an inclusive-of-taxes declaration."
                  : "A price was detected but its formatting does not fully match the expected pattern.",
            action: "Read the printed MRP panel manually and confirm currency, value and tax declaration.",
            confidence: mrp.value === null ? 0.9 : 0.8,
          }),
        );
        break;
      }
      // MRP consistency
      case "LM-PC-009": {
        const uniques = Array.from(
          new Set(mrp.candidates.map((c) => c.match(/([0-9]+(?:[.,][0-9]{1,2})?)/)?.[1]).filter(Boolean) as string[]),
        );
        const status: RuleStatus =
          uniques.length > 2
            ? "CRITICAL"
            : uniques.length === 2
              ? "VIOLATION"
              : uniques.length === 1
                ? "PASSED"
                : "WARNING";
        out.push(
          build(rule, {
            ruleStatus: status,
            detectedValue: uniques.join(" / ") || null,
            evidence: uniques.length
              ? `Price values found in the label text: ${uniques.join(", ")}. Source snippets: ${mrp.candidates.join(" | ")}`
              : "No price candidates were detected.",
            why:
              uniques.length > 1
                ? "More than one distinct price value was detected, which is ambiguous for the consumer."
                : uniques.length === 1
                  ? "Exactly one price value was detected."
                  : "No price value was detected, so uniqueness could not be assessed.",
            action: "Inspect the principal display panel for over-printed or duplicated price declarations.",
            confidence: uniques.length ? 0.88 : 0.5,
          }),
        );
        break;
      }
      // Standard unit
      case "LM-PC-006": {
        out.push(
          build(rule, {
            ruleStatus: quantity.standardUnit ? "PASSED" : quantity.raw ? "WARNING" : failStatus(rule.severity),
            detectedValue: quantity.raw,
            evidence: quantity.raw
              ? `Detected "${quantity.raw}"${
                  quantity.normalizedUnit
                    ? ` normalised to ${quantity.normalizedValue} ${quantity.normalizedUnit}`
                    : ""
                }${quantity.issues.length ? ` — ${quantity.issues.join(" ")}` : ""}`
              : "No net quantity number/unit pair was detected.",
            why: quantity.standardUnit
              ? `Unit "${quantity.unit}" is a recognised standard unit.`
              : quantity.raw
                ? "A quantity was detected but the unit is non-standard or ambiguous."
                : "No standard unit of weight, volume or number could be identified.",
            action: "Confirm the printed net quantity and its unit on the physical package.",
            confidence: quantity.standardUnit ? 0.85 : 0.75,
          }),
        );
        break;
      }
      // Legibility / sanity
      case "LM-PC-017": {
        const issues = [...mrp.issues, ...quantity.issues];
        const lowConf = fields.filter((f) => f.present && f.confidence < 60).map((f) => f.label);
        const all = [...issues, ...(lowConf.length ? [`Low-confidence reads: ${lowConf.join(", ")}`] : [])];
        out.push(
          build(rule, {
            ruleStatus: all.length === 0 ? "PASSED" : all.length > 2 ? "VIOLATION" : "WARNING",
            detectedValue: null,
            evidence: all.length ? all.join(" | ") : "All parsed values fall within expected patterns.",
            why:
              all.length === 0
                ? "No malformed or suspicious values were detected in the extracted declarations."
                : "One or more declarations look malformed, ambiguous or were read with low confidence.",
            action: "Manually re-read the flagged declarations on the physical package.",
            confidence: 0.7,
          }),
        );
        break;
      }
      default:
        break;
    }
  }

  return out;
}

export function computeScore(
  checks: CheckResult[],
  ocrConfidence: number,
  fields: ExtractedField[],
): ScoreBreakdown {
  const scored = checks.filter((c) => !c.excludeFromScore);
  const presence = scored.filter((c) => c.validation_type === "presence");
  const formatting = scored.filter((c) => c.validation_type === "format");
  const other = scored.filter((c) => c.validation_type === "consistency" || c.validation_type === "sanity");

  const bucket = (list: CheckResult[], max: number) => {
    if (!list.length) return max;
    const totalW = list.reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0);
    const gained = list.reduce(
      (s, c) => s + SEVERITY_WEIGHT[c.severity] * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0),
      0,
    );
    return (gained / totalW) * max;
  };

  const detected = fields.filter((f) => f.present);
  const avgConf = detected.length ? detected.reduce((s, f) => s + f.confidence, 0) / detected.length : 0;

  const declarations = bucket(presence, 60);
  const format = bucket(formatting, 20);
  const readability = (0.5 * ocrConfidence + 0.5 * avgConf) / 10;
  const otherScore = bucket(other, 10);
  const total = Math.round(declarations + format + readability + otherScore);

  return {
    declarations: Math.round(declarations * 10) / 10,
    formatting: Math.round(format * 10) / 10,
    readability: Math.round(readability * 10) / 10,
    other: Math.round(otherScore * 10) / 10,
    total: Math.max(0, Math.min(100, total)),
  };
}

export function statusFromChecks(
  checks: CheckResult[],
  score: number,
): "Compliant" | "Non-Compliant" | "Needs Review" {
  const criticalFail = checks.some(
    (c) => c.status === "fail" && (c.severity === "Critical" || c.severity === "High"),
  );
  if (criticalFail) return "Non-Compliant";
  const reviewable = checks.filter((c) => !c.excludeFromScore);
  if (reviewable.some((c) => c.status === "fail" || c.status === "warn") || score < 85) return "Needs Review";
  return "Compliant";
}

export function summarise(checks: CheckResult[]) {
  return {
    passed: checks.filter((c) => c.ruleStatus === "PASSED").length,
    warnings: checks.filter((c) => c.ruleStatus === "WARNING").length,
    violations: checks.filter((c) => c.ruleStatus === "VIOLATION").length,
    critical: checks.filter((c) => c.ruleStatus === "CRITICAL").length,
    verification: checks.filter((c) => c.verificationRequired).length,
  };
}
