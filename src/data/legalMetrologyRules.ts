import type { LegalRule, ProductCategory } from "@/lib/lm/types";

/**
 * LOCAL Legal Metrology dataset.
 *
 * Reference source (link only — never fetched at runtime):
 *   Department of Consumer Affairs — Legal Metrology Act / Legal Metrology section
 *   https://consumeraffairs.gov.in/pages/legal-metrology-act
 *   Legal Metrology (Packaged Commodities) Rules, 2011 (with applicable amendments)
 *
 * These entries are configurable PROTOTYPE requirements written in plain language.
 * Exact rule/provision numbers are intentionally NOT asserted. Where the legal
 * applicability or interpretation is uncertain, `verificationRequired` is true and
 * the UI shows "Inspector verification required".
 */

export const SOURCE_NAME = "Legal Metrology (Packaged Commodities) Rules, 2011";
export const SOURCE_URL = "https://consumeraffairs.gov.in/pages/legal-metrology-act";

export const DATASET_META = {
  name: SOURCE_NAME,
  publisher: "Department of Consumer Affairs",
  sourceUrl: SOURCE_URL,
  runtime: "Local" as const,
  externalConnection: "Not required" as const,
  version: "prototype-2026.1",
};

const FOODLIKE: ProductCategory[] = ["FOOD", "BEVERAGE", "COSMETIC"];

export const LEGAL_METROLOGY_RULES: LegalRule[] = [
  {
    id: "LM-PC-001",
    title: "Manufacturer / Packer / Importer Details",
    requirement:
      "Required manufacturer, packer or importer declaration should be detected where applicable.",
    field: "manufacturer_name",
    validationType: "presence",
    severity: "Critical",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-002",
    title: "Manufacturer / Packer / Importer Address",
    requirement:
      "A complete address of the manufacturer, packer or importer should be detected where applicable.",
    field: "manufacturer_address",
    validationType: "presence",
    severity: "Critical",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-003",
    title: "Country of Origin",
    requirement:
      "Country of origin should be declared for imported packaged commodities. Applicability depends on whether the commodity is imported.",
    field: "country_of_origin",
    validationType: "presence",
    severity: "Medium",
    applicability: "conditional",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: true,
  },
  {
    id: "LM-PC-004",
    title: "Common / Generic Name of Commodity",
    requirement: "The common or generic name of the commodity should be declared on the package.",
    field: "product_name",
    validationType: "presence",
    severity: "High",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-005",
    title: "Net Quantity Declaration",
    requirement: "Net quantity of the commodity should be declared on the package.",
    field: "net_quantity",
    validationType: "presence",
    severity: "Critical",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-006",
    title: "Net Quantity Standard Unit",
    requirement:
      "Net quantity should be expressed with a standard unit of weight, volume or number (g, kg, ml, L, N/pcs).",
    field: "unit",
    validationType: "format",
    severity: "High",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-007",
    title: "Retail Sale Price (MRP)",
    requirement: "The maximum retail sale price should be declared on the package.",
    field: "mrp",
    validationType: "presence",
    severity: "Critical",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-008",
    title: "MRP Format and Tax Declaration",
    requirement:
      "The retail sale price should be printed with a currency indicator and an inclusive-of-all-taxes style declaration.",
    field: "mrp",
    validationType: "format",
    severity: "High",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-009",
    title: "Unambiguous Retail Sale Price",
    requirement:
      "Only one unambiguous retail sale price should be readable on the package. Conflicting price values are treated as a discrepancy.",
    field: "mrp",
    validationType: "consistency",
    severity: "Critical",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-010",
    title: "Unit Sale Price",
    requirement:
      "A unit sale price may be required for certain commodities. Applicability and format require inspector verification against the official notification.",
    field: "multiple",
    validationType: "presence",
    severity: "Low",
    applicability: "verification_required",
    enabled: true,
    excludeFromScore: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: true,
  },
  {
    id: "LM-PC-011",
    title: "Month and Year of Manufacture / Packing",
    requirement:
      "The month and year of manufacture, packing or import should be declared where applicable to the commodity.",
    field: "mfg_date",
    validationType: "presence",
    severity: "High",
    applicability: "category_specific",
    categories: [...FOODLIKE, "GENERAL_PACKAGED_COMMODITY", "ELECTRONIC"],
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-012",
    title: "Best Before / Use By",
    requirement:
      "A best before or use by declaration should be present for commodities where shelf life is applicable.",
    field: "expiry_date",
    validationType: "presence",
    severity: "Medium",
    applicability: "category_specific",
    categories: FOODLIKE,
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-013",
    title: "Consumer Care Contact Number",
    requirement:
      "Consumer care details including a contact number should be declared for consumer complaints.",
    field: "care_phone",
    validationType: "presence",
    severity: "High",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-014",
    title: "Consumer Care Email / Website",
    requirement: "Consumer care details should include an email address or website where applicable.",
    field: "care_email",
    validationType: "presence",
    severity: "Medium",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
  {
    id: "LM-PC-015",
    title: "Batch / Lot / Code Number",
    requirement:
      "A batch, lot or code number should be declared where applicable to the commodity.",
    field: "batch_no",
    validationType: "presence",
    severity: "Medium",
    applicability: "conditional",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: true,
  },
  {
    id: "LM-PC-016",
    title: "Dimensions Declaration",
    requirement:
      "Dimensions may be a relevant declaration for certain commodities such as garments or specific products. Applicability requires inspector verification.",
    field: "multiple",
    validationType: "presence",
    severity: "Low",
    applicability: "verification_required",
    categories: ["GARMENT", "ELECTRONIC"],
    enabled: true,
    excludeFromScore: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: true,
  },
  {
    id: "LM-PC-017",
    title: "Legibility and Sanity of Declarations",
    requirement:
      "Declarations should be legible and free of malformed, ambiguous or implausible values.",
    field: "multiple",
    validationType: "sanity",
    severity: "High",
    applicability: "general",
    enabled: true,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    verificationRequired: false,
  },
];

export const RULE_COUNT = LEGAL_METROLOGY_RULES.length;
