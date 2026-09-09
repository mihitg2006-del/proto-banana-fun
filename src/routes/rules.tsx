import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/lm/AppShell";
import { DatasetStatus } from "@/components/lm/DatasetStatus";
import { SeverityBadge } from "@/components/lm/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { loadRules, saveRules } from "@/lib/lm/rules";
import type { Applicability, LegalRule } from "@/lib/lm/types";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Rules & Requirements | Smart Legal Metrology Inspector" },
      {
        name: "description",
        content:
          "Local Legal Metrology (Packaged Commodities) Rules, 2011 requirement set used by the prototype compliance engine, with applicability, severity and source.",
      },
      { property: "og:title", content: "Rules & Requirements | Smart Legal Metrology Inspector" },
      {
        property: "og:description",
        content: "Configurable local requirement dataset powering the prototype compliance engine.",
      },
    ],
  }),
  component: RulesPage,
});

const FILTERS: Array<{ key: "all" | Applicability; label: string }> = [
  { key: "all", label: "All" },
  { key: "general", label: "General" },
  { key: "conditional", label: "Conditional" },
  { key: "category_specific", label: "Category specific" },
  { key: "verification_required", label: "Verification required" },
];

const APPLICABILITY_LABEL: Record<Applicability, string> = {
  general: "General",
  conditional: "Conditional",
  category_specific: "Category specific",
  verification_required: "Verification required",
};

function RulesPage() {
  const [rules, setRules] = useState<LegalRule[]>(() => loadRules());
  const [filter, setFilter] = useState<"all" | Applicability>("all");

  const shown = useMemo(
    () => (filter === "all" ? rules : rules.filter((r) => r.applicability === filter)),
    [rules, filter],
  );

  function toggle(id: string, enabled: boolean) {
    const next = rules.map((r) => (r.id === id ? { ...r, enabled } : r));
    setRules(next);
    saveRules(next);
  }

  return (
    <AppShell
      title="Rules & Requirements"
      subtitle="Local requirement dataset used by the deterministic compliance engine"
    >
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {shown.length} of {rules.length} requirements
            </CardTitle>
            <div className="flex flex-wrap gap-2 pt-2">
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? "default" : "outline"}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {shown.map((r) => (
              <article key={r.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{r.id}</span>
                  <h3 className="font-semibold">{r.title}</h3>
                  <div className="ml-auto flex items-center gap-2">
                    <SeverityBadge severity={r.severity} />
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(v) => toggle(r.id, v)}
                      aria-label={`Enable rule ${r.id}`}
                    />
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">{r.requirement}</p>

                <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Field</dt>
                    <dd className="font-medium">{r.field}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Applicability</dt>
                    <dd className="font-medium">{APPLICABILITY_LABEL[r.applicability]}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium">{r.enabled ? "Enabled" : "Disabled"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="font-medium">{r.source}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Verification</dt>
                    <dd className="font-medium">
                      {r.verificationRequired ? "Inspector verification required" : "Not required"}
                    </dd>
                  </div>
                </dl>

                <a
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  View official source <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </article>
            ))}
            {!shown.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No requirements match this filter.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <DatasetStatus />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">How these rules are used</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Each enabled requirement is evaluated against the extracted label fields by a
                deterministic engine. Nothing here is fetched from the internet.
              </p>
              <p>
                Requirements marked “Inspector verification required” are never presented as legal
                decisions — they are surfaced for human confirmation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
