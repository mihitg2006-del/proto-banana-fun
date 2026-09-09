import type { CheckResult, ExtractedField, FieldKey, Rule, ScoreBreakdown, Severity } from "./types";
import type { ExtractionResult } from "./extract";
import { FIELD_LABELS } from "./extract";

const SEVERITY_WEIGHT: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function field(fields: ExtractedField[], key: FieldKey) {
  return fields.find((f) => f.key === key);
}

export function runCompliance(extraction: ExtractionResult, rules: Rule[]): CheckResult[] {
  const { fields, mrp, quantity } = extraction;
  const out: CheckResult[] = [];

  for (const rule of rules.filter((r) => r.enabled)) {
    const base = {
      rule_id: rule.rule_id,
      requirement: rule.requirement,
      field: rule.field === "multiple" ? "Multiple declarations" : FIELD_LABELS[rule.field],
      severity: rule.severity,
      validation_type: rule.validation_type,
    };

    if (rule.validation_type === "presence" && rule.field !== "multiple") {
      const f = field(fields, rule.field);
      let present = Boolean(f?.value);
      let evidence = f?.value ? `Detected: "${f.value}" (confidence ${f.confidence}%)` : (f?.note ?? "No matching pattern detected");

      // Manufacturer name / address may equally be satisfied by packer or importer details.
      if (!present && rule.field === "manufacturer_name") {
        const alt = field(fields, "packer_name")?.value ?? field(fields, "importer_name")?.value;
        if (alt) {
          present = true;
          evidence = `Satisfied by packer/importer declaration: "${alt}"`;
        }
      }
      if (!present && rule.field === "country_of_origin" && !field(fields, "importer_name")?.value) {
        out.push({
          ...base,
          status: "warn",
          why: "No importer declaration was detected, so country of origin may not be applicable to this commodity. It could not be confirmed either way.",
          evidence: "No 'Country of Origin' text detected; no importer details detected",
          action: "Confirm on the physical package whether the commodity is imported.",
        });
        continue;
      }

      out.push({
        ...base,
        status: present ? "pass" : "fail",
        why: present
          ? "The required declaration was located in the extracted label text."
          : `The system could not identify the required ${base.field.toLowerCase()} in the scanned label.`,
        evidence,
        action: present
          ? "Spot-check the printed value against the physical package."
          : "Verify the physical package and the applicable legal requirement before recording a violation.",
      });
      continue;
    }

    switch (rule.rule_id) {
      case "LM-PC-002": {
        const ok = mrp.wellFormatted && mrp.inclusiveOfTaxes;
        out.push({
          ...base,
          status: mrp.value === null ? "fail" : ok ? "pass" : "warn",
          why:
            mrp.value === null
              ? "No price value could be parsed, so formatting could not be validated."
              : ok
                ? "Price is printed with a currency indicator and an inclusive-of-taxes declaration."
                : "The price was detected but its formatting does not fully match the expected pattern.",
          evidence: mrp.raw ? `${mrp.raw}${mrp.issues.length ? " — " + mrp.issues.join(" ") : ""}` : "No MRP pattern detected",
          action: "Read the printed MRP panel manually and confirm currency, value and tax declaration.",
        });
        break;
      }
      case "LM-PC-004": {
        out.push({
          ...base,
          status: quantity.standardUnit ? "pass" : quantity.raw ? "warn" : "fail",
          why: quantity.standardUnit
            ? `Unit "${quantity.unit}" normalised to ${quantity.normalizedUnit} (${quantity.normalizedValue} ${quantity.normalizedUnit}).`
            : "A standard unit of measurement could not be confirmed from the extracted quantity.",
          evidence: quantity.raw ?? "No quantity string detected",
          action: "Confirm the unit symbol printed on the package matches a legally permitted unit.",
        });
        break;
      }
      case "LM-PC-014": {
        const uniques = Array.from(
          new Set(mrp.candidates.map((c) => c.match(/[0-9]+(?:[.,][0-9]{1,2})?/)?.[0]).filter(Boolean)),
        );
        out.push({
          ...base,
          status: uniques.length > 1 ? "fail" : uniques.length === 1 ? "pass" : "warn",
          why:
            uniques.length > 1
              ? "More than one distinct price value was detected on the label, which is ambiguous for the consumer."
              : uniques.length === 1
                ? "Exactly one price value was detected."
                : "No price value was detected, so uniqueness could not be assessed.",
          evidence: uniques.length ? `Values found: ${uniques.join(", ")}` : "No price candidates",
          action: "Inspect the principal display panel for over-printed or duplicated price declarations.",
        });
        break;
      }
      case "LM-PC-015": {
        const issues = [...mrp.issues, ...quantity.issues];
        const lowConf = fields.filter((f) => f.present && f.confidence < 60).map((f) => f.label);
        const all = [...issues, ...(lowConf.length ? [`Low-confidence reads: ${lowConf.join(", ")}`] : [])];
        out.push({
          ...base,
          status: all.length === 0 ? "pass" : all.length > 2 ? "fail" : "warn",
          why:
            all.length === 0
              ? "No malformed or suspicious values were detected in the extracted declarations."
              : "One or more declarations look malformed, ambiguous or were read with low confidence.",
          evidence: all.length ? all.join(" | ") : "All parsed values within expected patterns",
          action: "Manually re-read the flagged declarations on the physical package.",
        });
        break;
      }
      default:
        break;
    }
  }

  return out;
}

export function computeScore(checks: CheckResult[], ocrConfidence: number, fields: ExtractedField[]): ScoreBreakdown {
  const presence = checks.filter((c) => c.validation_type === "presence");
  const formatting = checks.filter((c) => c.validation_type === "format");
  const other = checks.filter((c) => c.validation_type === "consistency" || c.validation_type === "sanity");

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

export function statusFromChecks(checks: CheckResult[], score: number): "Compliant" | "Non-Compliant" | "Needs Review" {
  const criticalFail = checks.some((c) => c.status === "fail" && (c.severity === "Critical" || c.severity === "High"));
  if (criticalFail) return "Non-Compliant";
  if (checks.some((c) => c.status === "fail" || c.status === "warn") || score < 85) return "Needs Review";
  return "Compliant";
}
