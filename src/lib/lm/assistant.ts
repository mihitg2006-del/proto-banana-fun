import type { Inspection } from "./types";

export const ASSISTANT_DISCLAIMER =
  "AI suggestions are for assistance only. Final legal verification must be performed by an authorised Legal Metrology inspector.";

export const SUGGESTED_QUESTIONS = [
  "Why is this product non-compliant?",
  "What information is missing?",
  "Which fields were detected?",
  "Explain this violation in simple language.",
  "What should an inspector verify manually?",
];

/**
 * Grounded assistant: answers strictly from the extracted data, detected
 * violations and the configured prototype rule set. No external calls, so the
 * demo works with no API key.
 */
export function answerQuestion(q: string, insp: Inspection): string {
  const question = q.toLowerCase();
  const fails = insp.checks.filter((c) => c.status === "fail");
  const warns = insp.checks.filter((c) => c.status === "warn");
  const present = insp.fields.filter((f) => f.present);
  const missing = insp.fields.filter((f) => !f.present);

  const list = (items: string[]) => items.map((i) => `• ${i}`).join("\n");

  if (/non-?compliant|why.*flag|fail/.test(question)) {
    if (!fails.length && !warns.length)
      return `This inspection has no failed checks. The prototype compliance score is ${insp.score.total}/100 and the status is "${insp.status}".`;
    return [
      `Status: ${insp.status} — prototype compliance score ${insp.score.total}/100.`,
      fails.length ? `Failed checks (${fails.length}):\n${list(fails.map((c) => `${c.rule_id} — ${c.requirement}. Evidence: ${c.evidence}`))}` : "",
      warns.length ? `Warnings (${warns.length}):\n${list(warns.map((c) => `${c.rule_id} — ${c.requirement}`))}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (/missing|not detected|absent/.test(question)) {
    if (!missing.length) return "Every tracked declaration was detected in the extracted label text.";
    return `The following declarations were not detected:\n${list(missing.map((f) => f.label))}\n\nThese may still be printed on the package — verify physically.`;
  }

  if (/detected|extract|which fields|found/.test(question)) {
    return `Detected declarations (${present.length}/${insp.fields.length}):\n${list(
      present.map((f) => `${f.label}: ${f.value} (${f.confidence}% confidence)`),
    )}`;
  }

  if (/simple language|explain|meaning/.test(question)) {
    const target = fails[0] ?? warns[0];
    if (!target) return "There is no violation to explain — all configured checks passed.";
    return `${target.rule_id}: ${target.requirement}.\n\nIn simple terms: ${target.why}\n\nWhat the system saw: ${target.evidence}\n\nSuggested action: ${target.action}`;
  }

  if (/manual|inspector|verify|physical/.test(question)) {
    const actions = Array.from(new Set([...fails, ...warns].map((c) => c.action)));
    return `Manual verification checklist for inspection ${insp.id}:\n${list(
      actions.length ? actions : ["Spot-check all printed declarations against the physical package."],
    )}\n\n${ASSISTANT_DISCLAIMER}`;
  }

  if (/score/.test(question)) {
    return `Prototype compliance score: ${insp.score.total}/100 — mandatory declarations ${insp.score.declarations}/60, formatting ${insp.score.formatting}/20, readability ${insp.score.readability}/10, other checks ${insp.score.other}/10.`;
  }

  if (/mrp|price/.test(question)) {
    const f = insp.fields.find((x) => x.key === "mrp");
    return f?.value
      ? `MRP detected as "${f.value}" with ${f.confidence}% confidence. Source text: ${f.source ?? "n/a"}.`
      : "No MRP value could be extracted from this label.";
  }

  if (/quantity|weight|net/.test(question)) {
    const f = insp.fields.find((x) => x.key === "net_quantity");
    return f?.value
      ? `Net quantity detected as "${f.value}" with ${f.confidence}% confidence.`
      : "No net quantity declaration could be extracted from this label.";
  }

  return `I can only answer from this inspection's extracted data, detected violations and the configured prototype rules. Try: ${SUGGESTED_QUESTIONS.join(" / ")}`;
}
