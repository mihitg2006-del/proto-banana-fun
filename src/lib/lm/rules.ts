import type { LegalRule } from "./types";
import { LEGAL_METROLOGY_RULES, DATASET_META } from "@/data/legalMetrologyRules";

/**
 * Rule configuration is derived from the LOCAL Legal Metrology dataset
 * (src/data/legalMetrologyRules.ts). Nothing is fetched at runtime; only the
 * per-rule `enabled` toggle is persisted in localStorage.
 */
export const DEFAULT_RULES: LegalRule[] = LEGAL_METROLOGY_RULES;
export const RULES_DATASET = DATASET_META;

const KEY = "slmi_rules_v2";

export function loadRules(): LegalRule[] {
  if (typeof window === "undefined") return DEFAULT_RULES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_RULES;
    const saved = JSON.parse(raw) as Array<{ id: string; enabled: boolean }>;
    return DEFAULT_RULES.map((r) => {
      const match = saved.find((s) => s.id === r.id);
      return match ? { ...r, enabled: match.enabled } : r;
    });
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRules(rules: LegalRule[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    KEY,
    JSON.stringify(rules.map((r) => ({ id: r.id, enabled: r.enabled }))),
  );
}
