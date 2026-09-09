import { cn } from "@/lib/utils";
import type { CheckStatus, Severity } from "@/lib/lm/types";

export function StatusBadge({ status }: { status: "Compliant" | "Non-Compliant" | "Needs Review" }) {
  const map = {
    Compliant: "bg-success/12 text-success border-success/30",
    "Non-Compliant": "bg-destructive/12 text-destructive border-destructive/30",
    "Needs Review": "bg-warning/15 text-warning-foreground border-warning/40",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", map[status])}>
      {status}
    </span>
  );
}

export function CheckBadge({ status }: { status: CheckStatus }) {
  const map = {
    pass: ["Passed", "bg-success/12 text-success border-success/30"],
    warn: ["Warning", "bg-warning/15 text-warning-foreground border-warning/40"],
    fail: ["Violation", "bg-destructive/12 text-destructive border-destructive/30"],
  } as const;
  const [label, cls] = map[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", cls)}>
      {label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    Critical: "bg-destructive text-destructive-foreground",
    High: "bg-destructive/15 text-destructive",
    Medium: "bg-warning/20 text-warning-foreground",
    Low: "bg-muted text-muted-foreground",
  };
  return <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", map[severity])}>{severity}</span>;
}

export function confidenceBand(c: number): "High" | "Medium" | "Low" {
  return c >= 80 ? "High" : c >= 55 ? "Medium" : "Low";
}

export function ConfidenceChip({ value }: { value: number }) {
  const band = confidenceBand(value);
  const cls =
    band === "High"
      ? "bg-success/12 text-success"
      : band === "Medium"
        ? "bg-warning/20 text-warning-foreground"
        : "bg-destructive/12 text-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium", cls)}>
      {band} · {value}%
    </span>
  );
}

export function ScoreRing({ value, size = 128 }: { value: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 85 ? "var(--success)" : value >= 60 ? "var(--warning)" : "var(--destructive)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Prototype compliance score ${value} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" className="fill-foreground" fontSize={size * 0.26} fontWeight={700}>
        {value}
      </text>
      <text x="50%" y="66%" textAnchor="middle" className="fill-muted-foreground" fontSize={size * 0.11}>
        / 100
      </text>
    </svg>
  );
}
