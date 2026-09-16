import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/lm/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOfficer } from "@/lib/auth/officer-context";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Officer Profile | Smart Legal Metrology Inspector Console" },
      {
        name: "description",
        content:
          "Officer profile details — designation, department, jurisdiction and role for the signed-in Legal Metrology inspector.",
      },
      { property: "og:title", content: "Officer Profile | Smart Legal Metrology" },
      {
        property: "og:description",
        content: "Designation, department, jurisdiction and role of the signed-in inspector.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { officer, session } = useOfficer();

  const rows: Array<[string, string]> = [
    ["Officer ID", officer?.officer_id ?? "—"],
    ["Full name", officer?.full_name ?? "—"],
    ["Designation", officer?.designation ?? "—"],
    ["Department", officer?.department ?? "—"],
    ["District", officer?.district ?? "—"],
    ["State", officer?.state ?? "—"],
    ["Email", officer?.email ?? session?.user?.email ?? "—"],
    ["Role", officer?.role ?? "—"],
    ["Status", officer?.is_active ? "Active" : "Inactive"],
  ];

  return (
    <AppShell title="Officer Profile" subtitle="Authorized officer account details">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>
            Officer records are maintained by the system administrator. Contact the department for
            corrections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </AppShell>
  );
}
