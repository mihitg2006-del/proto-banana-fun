import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/lm/AppShell";
import { StatusBadge, ScoreRing } from "@/components/lm/bits";
import { DatasetStatus } from "@/components/lm/DatasetStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listInspections } from "@/lib/lm/store";
import type { Inspection } from "@/lib/lm/types";
import { ScanLine, History, Scale, FileText, AlertTriangle, PackageCheck, PackageX, Gauge } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inspector Dashboard | Smart Legal Metrology Inspector" },
      {
        name: "description",
        content:
          "AI-assisted dashboard for packaged commodity label compliance: inspections, violations, prototype compliance scores and reports.",
      },
      { property: "og:title", content: "Inspector Dashboard | Smart Legal Metrology Inspector" },
      {
        property: "og:description",
        content: "Track packaged commodity inspections, violations and prototype compliance scores.",
      },
    ],
  }),
  component: Dashboard,
});

function useInspections() {
  const [items, setItems] = useState<Inspection[]>([]);
  useEffect(() => {
    const sync = () => setItems(listInspections());
    sync();
    window.addEventListener("slmi:inspections", sync);
    return () => window.removeEventListener("slmi:inspections", sync);
  }, []);
  return items;
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneCls = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    danger: "text-destructive bg-destructive/10",
    warning: "text-warning-foreground bg-warning/20",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex size-11 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const items = useInspections();
  const total = items.length;
  const compliant = items.filter((i) => i.status === "Compliant").length;
  const nonCompliant = items.filter((i) => i.status === "Non-Compliant").length;
  const critical = items.reduce(
    (s, i) => s + i.checks.filter((c) => c.status === "fail" && c.severity === "Critical").length,
    0,
  );
  const avg = total ? Math.round(items.reduce((s, i) => s + i.score.total, 0) / total) : 0;

  const violationStats = Object.entries(
    items
      .flatMap((i) => i.checks.filter((c) => c.status === "fail"))
      .reduce<Record<string, number>>((acc, c) => {
        acc[c.field] = (acc[c.field] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const statusPie = [
    { name: "Compliant", value: compliant, fill: "var(--success)" },
    { name: "Needs Review", value: items.filter((i) => i.status === "Needs Review").length, fill: "var(--warning)" },
    { name: "Non-Compliant", value: nonCompliant, fill: "var(--destructive)" },
  ].filter((d) => d.value > 0);

  const trend = [...items]
    .slice(0, 10)
    .reverse()
    .map((i, idx) => ({ name: `#${idx + 1}`, score: i.score.total }));

  return (
    <AppShell
      title="Inspector Dashboard"
      subtitle="AI-assisted packaged commodity compliance · SIH 2026 PS 26034 prototype"
      actions={
        <>
          <Button asChild>
            <Link to="/inspect">
              <ScanLine className="size-4" /> New Inspection
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/history">
              <History className="size-4" /> Inspection History
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/rules">
              <Scale className="size-4" /> Rules & Requirements
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/reports">
              <FileText className="size-4" /> Reports
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-5">
        <DatasetStatus />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total Products Inspected" value={total} icon={PackageCheck} />
        <Stat label="Compliant Products" value={compliant} icon={PackageCheck} tone="success" />
        <Stat label="Non-Compliant Products" value={nonCompliant} icon={PackageX} tone="danger" />
        <Stat label="Critical Violations" value={critical} icon={AlertTriangle} tone="warning" />
        <Stat label="Average Prototype Score" value={total ? `${avg}/100` : "—"} icon={Gauge} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Violation Statistics</CardTitle>
            <CardDescription>Failed checks grouped by declaration</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {violationStats.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={violationStats} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="field" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--destructive)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance Split</CardTitle>
            <CardDescription>Status of inspected packages</CardDescription>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center">
            {statusPie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {statusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Inspections</CardTitle>
            <CardDescription>Latest packaged commodities analysed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.slice(0, 6).map((i) => (
              <Link
                key={i.id}
                to="/inspection/$id"
                params={{ id: i.id }}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60"
              >
                {i.imageDataUrl ? (
                  <img src={i.imageDataUrl} alt="" className="size-12 rounded object-cover" width={48} height={48} />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.id} · {new Date(i.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{i.score.total}</span>
                <StatusBadge status={i.status} />
              </Link>
            ))}
            {!items.length ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No inspections yet. Start with{" "}
                <Link to="/inspect" className="font-medium text-primary underline">
                  a new inspection
                </Link>{" "}
                using a demo sample.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Prototype Score</CardTitle>
            <CardDescription>Not an official legal score</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ScoreRing value={avg} />
            <div className="h-24 w-full">
              {trend.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <XAxis dataKey="name" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                    />
                    <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function EmptyChart() {
  return <p className="w-full text-center text-sm text-muted-foreground">Run an inspection to populate this chart.</p>;
}
