import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/lm/AppShell";
import { StatusBadge } from "@/components/lm/bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listInspections } from "@/lib/lm/store";
import type { Inspection } from "@/lib/lm/types";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Product Comparison | Smart Legal Metrology Inspector" },
      {
        name: "description",
        content:
          "Compare two packaged commodity inspections side by side: declarations, prototype compliance score, warnings and violations.",
      },
      { property: "og:title", content: "Product Comparison | Smart Legal Metrology Inspector" },
      {
        property: "og:description",
        content: "Side-by-side comparison of two label inspections and their rule validation outcomes.",
      },
    ],
  }),
  component: ComparePage,
});

function Column({ insp }: { insp: Inspection | undefined }) {
  if (!insp) return <p className="text-sm text-muted-foreground">Select an inspection.</p>;
  const passed = insp.checks.filter((c) => c.status === "pass").length;
  const warn = insp.checks.filter((c) => c.status === "warn").length;
  const fail = insp.checks.filter((c) => c.status === "fail").length;
  return (
    <div className="space-y-3">
      {insp.imageDataUrl && (
        <img
          src={insp.imageDataUrl}
          alt={`Label of ${insp.productName}`}
          className="h-40 w-full rounded-lg border object-cover"
        />
      )}
      <div className="flex items-center gap-2">
        <StatusBadge status={insp.status} />
        <span className="text-sm font-semibold">{insp.score.total}/100</span>
      </div>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Category</dt>
          <dd>{insp.category ?? "UNKNOWN"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Passed</dt>
          <dd>{passed}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Warnings</dt>
          <dd>{warn}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Violations</dt>
          <dd>{fail}</dd>
        </div>
      </dl>
      <div className="rounded-lg border p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Declarations
        </p>
        <ul className="space-y-1 text-sm">
          {insp.fields.map((f) => (
            <li key={f.key} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{f.label}</span>
              <span className={f.present ? "" : "text-destructive"}>
                {f.value ?? "Not detected"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ComparePage() {
  const [items, setItems] = useState<Inspection[]>([]);
  const [left, setLeft] = useState<string>("");
  const [right, setRight] = useState<string>("");

  useEffect(() => {
    const list = listInspections();
    setItems(list);
    setLeft(list[0]?.id ?? "");
    setRight(list[1]?.id ?? "");
  }, []);

  const a = useMemo(() => items.find((i) => i.id === left), [items, left]);
  const b = useMemo(() => items.find((i) => i.id === right), [items, right]);

  return (
    <AppShell title="Product Comparison" subtitle="Compare two inspections side by side">
      {items.length < 2 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Run at least two inspections to use the comparison view.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { value: left, set: setLeft, insp: a, label: "Inspection A" },
            { value: right, set: setRight, insp: b, label: "Inspection B" },
          ].map((side) => (
            <Card key={side.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{side.label}</CardTitle>
                <Select value={side.value} onValueChange={side.set}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose an inspection" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.productName} · {i.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <Column insp={side.insp} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
