import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/lm/AppShell";
import { StatusBadge } from "@/components/lm/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteInspection, listInspections } from "@/lib/lm/store";
import type { Inspection } from "@/lib/lm/types";
import { ScanLine, Trash2 } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Inspection History | Smart Legal Metrology Inspector" },
      {
        name: "description",
        content:
          "Locally stored packaged commodity inspections with product, category, prototype compliance score, status and violations.",
      },
      { property: "og:title", content: "Inspection History | Smart Legal Metrology Inspector" },
      {
        property: "og:description",
        content: "Browse, reopen and delete previously completed label inspections stored on this device.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [items, setItems] = useState<Inspection[]>([]);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setItems(listInspections());
    sync();
    window.addEventListener("slmi:inspections", sync);
    return () => window.removeEventListener("slmi:inspections", sync);
  }, []);

  const shown = items.filter((i) =>
    `${i.id} ${i.productName} ${i.category ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell
      title="Inspection History"
      subtitle="All inspections are stored locally on this device"
      actions={
        <Button asChild>
          <Link to="/inspect">
            <ScanLine className="mr-2 h-4 w-4" /> New inspection
          </Link>
        </Button>
      }
    >
      <Card>
        <CardContent className="p-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by inspection ID, product or category"
            className="mb-4 max-w-sm"
            aria-label="Search inspections"
          />

          {!shown.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No inspections stored yet. Run a demo inspection to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Inspection ID</th>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Violations</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i) => {
                    const violations = i.checks.filter((c) => c.status === "fail").length;
                    return (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs">{i.id}</td>
                        <td className="py-2 pr-3 font-medium">{i.productName}</td>
                        <td className="py-2 pr-3">{i.category ?? "UNKNOWN"}</td>
                        <td className="py-2 pr-3">{new Date(i.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-3 font-semibold">{i.score.total}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={i.status} />
                        </td>
                        <td className="py-2 pr-3">{violations}</td>
                        <td className="py-2 pr-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate({ to: "/inspection/$id", params: { id: i.id } })}
                            >
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Delete inspection ${i.id}`}
                              onClick={() => {
                                deleteInspection(i.id);
                                setItems(listInspections());
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
