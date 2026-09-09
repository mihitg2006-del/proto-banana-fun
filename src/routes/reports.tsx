import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/lm/AppShell";
import { DatasetStatus } from "@/components/lm/DatasetStatus";
import { StatusBadge } from "@/components/lm/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listInspections } from "@/lib/lm/store";
import { generateReport } from "@/lib/lm/report";
import type { Inspection } from "@/lib/lm/types";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Inspection Reports | Smart Legal Metrology Inspector" },
      {
        name: "description",
        content:
          "Generate prototype PDF compliance reports with extracted declarations, evidence, rule sources and inspector verification notes.",
      },
      { property: "og:title", content: "Inspection Reports | Smart Legal Metrology Inspector" },
      {
        property: "og:description",
        content: "Download evidence-based prototype compliance reports for completed inspections.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [items, setItems] = useState<Inspection[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setItems(listInspections());
    sync();
    window.addEventListener("slmi:inspections", sync);
    return () => window.removeEventListener("slmi:inspections", sync);
  }, []);

  async function download(insp: Inspection) {
    setBusy(insp.id);
    try {
      await generateReport(insp);
      toast.success("Report generated", { description: insp.id });
    } catch {
      toast.error("Could not generate the report");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell title="Reports" subtitle="Prototype compliance reports — final legal verification required">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{items.length} completed inspections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!items.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No inspections available yet. Run an inspection to generate a report.
              </p>
            )}
            {items.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-48">
                  <p className="font-medium">{i.productName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{i.id}</p>
                </div>
                <span className="text-sm text-muted-foreground">{i.category ?? "UNKNOWN"}</span>
                <span className="text-sm font-semibold">{i.score.total}/100</span>
                <StatusBadge status={i.status} />
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: "/inspection/$id", params: { id: i.id } })}
                  >
                    Open
                  </Button>
                  <Button size="sm" disabled={busy === i.id} onClick={() => download(i)}>
                    <Download className="mr-2 h-4 w-4" />
                    {busy === i.id ? "Generating…" : "PDF report"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <DatasetStatus compact />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">What the report contains</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc space-y-1 pl-4">
                <li>Inspection ID, product, category and date</li>
                <li>Product image and extracted declarations with confidence</li>
                <li>Prototype compliance score and score breakdown</li>
                <li>Passed checks, warnings and violations with evidence and source</li>
                <li>Inspector notes and items needing verification</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
