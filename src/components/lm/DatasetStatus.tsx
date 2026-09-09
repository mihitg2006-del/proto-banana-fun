import { DATASET_META, RULE_COUNT, SOURCE_URL } from "@/data/legalMetrologyRules";
import { ExternalLink } from "lucide-react";

export function DatasetStatus({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Legal Metrology dataset status">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Legal Metrology dataset
        </h2>
        <span className="ml-auto rounded-full border border-success/30 bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
          Loaded
        </span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Dataset</dt>
          <dd className="font-medium">{DATASET_META.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Source</dt>
          <dd className="font-medium">{DATASET_META.publisher}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Rules loaded</dt>
          <dd className="font-medium">{RULE_COUNT}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Runtime</dt>
          <dd className="font-medium">{DATASET_META.runtime}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">External connection</dt>
          <dd className="font-medium">{DATASET_META.externalConnection}</dd>
        </div>
      </dl>

      {!compact && (
        <p className="mt-3 text-xs text-muted-foreground">
          Rules are stored locally inside the application. The official government page is a reference
          link only and is never contacted while the app runs.
        </p>
      )}

      <a
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        href={SOURCE_URL}
        target="_blank"
        rel="noreferrer noopener"
      >
        View official source <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </section>
  );
}
