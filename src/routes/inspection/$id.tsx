import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/lm/AppShell";
import { DatasetStatus } from "@/components/lm/DatasetStatus";
import { ConfidenceChip, ScoreRing, SeverityBadge, StatusBadge } from "@/components/lm/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInspection, saveInspection } from "@/lib/lm/store";
import { generateReport } from "@/lib/lm/report";
import { ASSISTANT_DISCLAIMER, SUGGESTED_QUESTIONS, answerQuestion } from "@/lib/lm/assistant";
import { CATEGORY_LABELS } from "@/services/categoryDetection";
import { summarise } from "@/services/complianceEngine";
import type { CheckResult, Inspection, RuleStatus } from "@/lib/lm/types";
import { Download, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inspection/$id")({
  head: () => ({
    meta: [
      { title: "Inspection Result | Smart Legal Metrology Inspector" },
      {
        name: "description",
        content:
          "AI-assisted prototype compliance assessment for a packaged commodity label: AI detection, deterministic rule validation and inspector verification.",
      },
      { property: "og:title", content: "Inspection Result | Smart Legal Metrology Inspector" },
      {
        property: "og:description",
        content: "Detected declarations, rule validation evidence and prototype compliance score.",
      },
    ],
  }),
  component: ResultPage,
});

const RULE_STATUS_STYLE: Record<RuleStatus, string> = {
  PASSED: "bg-success/12 text-success border-success/30",
  WARNING: "bg-warning/15 text-warning-foreground border-warning/40",
  VIOLATION: "bg-destructive/12 text-destructive border-destructive/30",
  CRITICAL: "bg-destructive text-destructive-foreground border-destructive",
};

function RuleStatusBadge({ status }: { status: RuleStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${RULE_STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

function CheckCard({ check }: { check: CheckResult }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{check.ruleId}</span>
        <span className="text-sm font-medium">{check.title ?? check.requirement}</span>
        <div className="ml-auto flex items-center gap-2">
          <SeverityBadge severity={check.severity} />
          <RuleStatusBadge status={check.ruleStatus} />
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            Explain <ChevronDown className={`ml-1 h-3.5 w-3.5 ${open ? "rotate-180" : ""}`} aria-hidden />
          </Button>
        </div>
      </div>

      {open && (
        <dl className="mt-3 space-y-2 border-t pt-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Why flagged?</dt>
            <dd>{check.why}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Detected evidence</dt>
            <dd className="text-muted-foreground">{check.evidence}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Detected value</dt>
            <dd>{check.detectedValue ?? "Not detected"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Requirement</dt>
            <dd>{check.requirement}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Confidence</dt>
            <dd>{Math.round((check.confidence ?? 0) * 100)}%</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Verification status</dt>
            <dd>{check.verificationRequired ? "Inspector verification required" : "Not required"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Suggested inspector action</dt>
            <dd>{check.action}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted-foreground">Source</dt>
            <dd>
              {check.source}{" "}
              <a
                className="inline-flex items-center gap-1 text-primary hover:underline"
                href={check.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                View official source <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
}

function ResultPage() {
  const { id } = useParams({ from: "/inspection/$id" });
  const navigate = useNavigate();
  const [insp, setInsp] = useState<Inspection | null | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const found = getInspection(id);
    setInsp(found ?? null);
    setNotes(found?.notes ?? "");
  }, [id]);

  const summary = useMemo(() => (insp ? summarise(insp.checks) : null), [insp]);

  if (insp === undefined) {
    return (
      <AppShell title="Inspection Result">
        <p className="text-sm text-muted-foreground">Loading inspection…</p>
      </AppShell>
    );
  }

  if (insp === null) {
    return (
      <AppShell title="Inspection not found">
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No stored inspection matches <span className="font-mono">{id}</span>.
            </p>
            <Button asChild>
              <Link to="/history">Back to history</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const record = insp;
  const verificationItems = record.checks.filter((c) => c.verificationRequired);

  function saveNotes(value: string) {
    setNotes(value);
    saveInspection({ ...record, notes: value });
  }

  return (
    <AppShell
      title={record.productName}
      subtitle="AI-assisted prototype compliance assessment — not an official legal decision"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/history" })}>
            History
          </Button>
          <Button
            onClick={async () => {
              try {
                await generateReport(record);
                toast.success("Report generated");
              } catch {
                toast.error("Could not generate the report");
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" /> PDF report
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-6 p-5">
              <ScoreRing value={record.score.total} />
              <div className="min-w-56 space-y-1 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Prototype compliance score
                </p>
                <StatusBadge status={record.status} />
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between gap-6">
                    <dt className="text-muted-foreground">Inspection ID</dt>
                    <dd className="font-mono text-xs">{record.id}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd>{new Date(record.createdAt).toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd>{CATEGORY_LABELS[record.category ?? "UNKNOWN"]}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-muted-foreground">Category confidence</dt>
                    <dd>{Math.round(record.categoryConfidence ?? 0)}%</dd>
                  </div>
                </dl>
                {record.categoryVerificationRequired && (
                  <p className="pt-1 text-xs text-warning-foreground">Inspector verification required</p>
                )}
              </div>
              {record.imageDataUrl && (
                <img
                  src={record.imageDataUrl}
                  alt={`Scanned label of ${record.productName}`}
                  className="ml-auto h-32 w-44 rounded-lg border object-cover"
                />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Passed checks", summary?.passed ?? 0],
              ["Warnings", summary?.warnings ?? 0],
              ["Violations", summary?.violations ?? 0],
              ["Critical", summary?.critical ?? 0],
              ["Verification", summary?.verification ?? 0],
            ].map(([label, value]) => (
              <Card key={label as string}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="rules">
            <TabsList>
              <TabsTrigger value="ai">AI detection</TabsTrigger>
              <TabsTrigger value="rules">Rule validation</TabsTrigger>
              <TabsTrigger value="verify">Inspector verification</TabsTrigger>
            </TabsList>

            <TabsContent value="ai">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    What OCR / AI detected — detection only, no legal conclusion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {record.fields.map((f) => (
                    <div key={f.key} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0">
                      <span className="w-56 text-sm text-muted-foreground">{f.label}</span>
                      <span className={`text-sm ${f.present ? "" : "text-destructive"}`}>
                        {f.value ?? "Not detected"}
                      </span>
                      <span className="ml-auto">
                        <ConfidenceChip value={f.confidence} />
                      </span>
                    </div>
                  ))}
                  <details className="pt-2">
                    <summary className="cursor-pointer text-sm text-primary">Raw OCR text</summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-3 text-xs">{record.rawText}</pre>
                  </details>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Deterministic validation against the local Legal Metrology rule dataset
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {record.checks.map((c) => (
                    <CheckCard key={c.ruleId ?? c.rule_id} check={c} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verify">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Requires human / legal verification ({verificationItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {verificationItems.length ? (
                    verificationItems.map((c) => <CheckCard key={`v-${c.ruleId}`} check={c} />)
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No item in this inspection was flagged for inspector verification.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <DatasetStatus compact />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Legal Metrology assistant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Button
                    key={q}
                    size="sm"
                    variant="outline"
                    className="h-auto py-1 text-xs"
                    onClick={() => {
                      setQuestion(q);
                      setAnswer(answerQuestion(q, record));
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this inspection…"
                rows={2}
              />
              <Button size="sm" onClick={() => setAnswer(answerQuestion(question, record))}>
                Ask
              </Button>
              {answer && <p className="whitespace-pre-wrap rounded bg-muted p-3 text-sm">{answer}</p>}
              <p className="text-xs text-muted-foreground">{ASSISTANT_DISCLAIMER}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Inspector notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => saveNotes(e.target.value)}
                rows={5}
                placeholder="Observations recorded during physical verification…"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
