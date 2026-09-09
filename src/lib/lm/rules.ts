import type { Rule } from "./types";

/**
 * Prototype rule configuration derived from the SIH problem statement and a demo
 * rule set inspired by the Legal Metrology (Packaged Commodities) Rules, 2011.
 * These are CONFIGURABLE prototype requirements, not an authoritative legal text.
 */
export const DEFAULT_RULES: Rule[] = [
  {
    rule_id: "LM-PC-001",
    field: "mrp",
    requirement: "Maximum Retail Price (MRP) must be declared",
    severity: "Critical",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-002",
    field: "mrp",
    requirement: "MRP must be printed with currency and an inclusive-of-taxes style declaration",
    severity: "High",
    validation_type: "format",
    enabled: true,
  },
  {
    rule_id: "LM-PC-003",
    field: "net_quantity",
    requirement: "Net quantity must be declared",
    severity: "Critical",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-004",
    field: "unit",
    requirement: "Net quantity must use a standard unit (g, kg, ml, L, N/pcs)",
    severity: "High",
    validation_type: "format",
    enabled: true,
  },
  {
    rule_id: "LM-PC-005",
    field: "manufacturer_name",
    requirement: "Name of manufacturer / packer / importer must be declared",
    severity: "Critical",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-006",
    field: "manufacturer_address",
    requirement: "Complete address of manufacturer / packer / importer must be declared",
    severity: "Critical",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-007",
    field: "care_phone",
    requirement: "Consumer care contact number must be declared",
    severity: "High",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-008",
    field: "care_email",
    requirement: "Consumer care email or website must be declared",
    severity: "Medium",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-009",
    field: "mfg_date",
    requirement: "Month and year of manufacture / packing must be declared",
    severity: "High",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-010",
    field: "expiry_date",
    requirement: "Best before / use by declaration must be present for applicable commodities",
    severity: "Medium",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-011",
    field: "country_of_origin",
    requirement: "Country of origin must be declared for imported commodities",
    severity: "Medium",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-012",
    field: "batch_no",
    requirement: "Batch / lot / code number must be declared",
    severity: "Medium",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-013",
    field: "product_name",
    requirement: "Name / common name of the commodity must be declared",
    severity: "High",
    validation_type: "presence",
    enabled: true,
  },
  {
    rule_id: "LM-PC-014",
    field: "mrp",
    requirement: "Only one unambiguous MRP value should appear on the principal display panel",
    severity: "Critical",
    validation_type: "consistency",
    enabled: true,
  },
  {
    rule_id: "LM-PC-015",
    field: "multiple",
    requirement: "Declarations must be legible and free of suspicious or malformed values",
    severity: "High",
    validation_type: "sanity",
    enabled: true,
  },
];

const KEY = "slmi_rules_v1";

export function loadRules(): Rule[] {
  if (typeof window === "undefined") return DEFAULT_RULES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_RULES;
    const saved = JSON.parse(raw) as Rule[];
    return DEFAULT_RULES.map((r) => {
      const match = saved.find((s) => s.rule_id === r.rule_id);
      return match ? { ...r, enabled: match.enabled } : r;
    });
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRules(rules: Rule[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(rules));
}
