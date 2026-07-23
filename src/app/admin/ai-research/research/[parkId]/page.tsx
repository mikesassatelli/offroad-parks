import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Layers, Database, ClipboardCheck } from "lucide-react";
import { getCurrentFieldValue } from "@/lib/ai/research-lifecycle";
import type {
  DbPark,
  DataSourceSummary,
  DomainReliabilitySummary,
  FieldExtractionSummary,
} from "@/lib/types";
import { SourceManagementTable } from "@/components/admin/SourceManagementTable";
import { DomainReliabilityTable } from "@/components/admin/DomainReliabilityTable";
import { FieldExtractionReview } from "@/components/admin/FieldExtractionReview";

export default async function ParkResearchWorkspacePage({
  params,
}: {
  params: Promise<{ parkId: string }>;
}) {
  const { parkId } = await params;

  const park = await prisma.park.findUnique({
    where: { id: parkId },
    include: {
      terrain: true,
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
    },
  });

  if (!park) notFound();

  const [sources, extractions, domainEntries] = await Promise.all([
    prisma.dataSource.findMany({
      where: { parkId },
      orderBy: [{ reliability: "desc" }, { createdAt: "desc" }],
    }),
    prisma.fieldExtraction.findMany({
      where: { parkId, status: "PENDING_REVIEW" },
      include: { dataSource: { select: { url: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.domainReliability.findMany({ orderBy: { defaultReliability: "desc" } }),
  ]);

  const sourceSummaries: DataSourceSummary[] = sources.map((s) => ({
    id: s.id,
    parkId: s.parkId,
    url: s.url,
    type: s.type,
    origin: s.origin,
    title: s.title,
    reliability: s.reliability,
    isOfficial: s.isOfficial,
    lastCrawledAt: s.lastCrawledAt?.toISOString() ?? null,
    contentChanged: s.contentChanged,
    crawlStatus: s.crawlStatus,
    crawlError: s.crawlError,
    approveCount: s.approveCount,
    rejectCount: s.rejectCount,
    createdAt: s.createdAt.toISOString(),
  }));

  const extractionSummaries: FieldExtractionSummary[] = extractions.map((e) => ({
    id: e.id,
    parkId: e.parkId,
    parkName: park.name,
    parkSlug: park.slug,
    fieldName: e.fieldName,
    extractedValue: e.extractedValue,
    currentValue: getCurrentFieldValue(park as unknown as DbPark, e.fieldName),
    confidence: e.confidence,
    confidenceScore: e.confidenceScore,
    status: e.status,
    sourcesChecked: e.sourcesChecked,
    sourceUrl: e.dataSource?.url ?? null,
    sourceTitle: e.dataSource?.title ?? null,
    sourceQuote: e.sourceQuote,
    sessionId: e.sessionId,
    createdAt: e.createdAt.toISOString(),
  }));

  const domainSummaries: DomainReliabilitySummary[] = domainEntries.map((d) => ({
    id: d.id,
    domainPattern: d.domainPattern,
    defaultReliability: d.defaultReliability,
    isBlocked: d.isBlocked,
    locked: d.locked,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/ai-research/research"
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
        >
          <ArrowLeft className="w-4 h-4" /> All parks
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">{park.name}</h2>
          <ResearchStatusBadge status={park.researchStatus} />
          <Link
            href={`/parks/${park.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-3 h-3" /> View public page
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Run research as many times as you like — each run crawls sources, discovers new ones, and
          adds any findings to the proposed changes below. Nothing is applied to the live park until
          you approve it.
        </p>
      </div>

      {/* Proposed changes (accumulated, awaiting review) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Proposed Changes</h3>
          {extractionSummaries.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/50 px-2 py-0.5 text-xs font-medium">
              {extractionSummaries.length} pending
            </span>
          )}
        </div>
        {extractionSummaries.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No proposed changes yet. Run research below to have the AI gather data for this park.
              Anything it finds will show up here for you to approve, edit, or deny.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Approve to apply a value to the live park, or deny to discard it. You can edit a value
              before approving. Approved and denied results also train the domain-accuracy scores.
            </p>
            <FieldExtractionReview extractions={extractionSummaries} />
          </>
        )}
      </section>

      {/* Sources + Run Research (SourceManagementTable includes the Run Research trigger) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Sources &amp; Research</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          These are the sources the AI reads for this park. Add trusted URLs, skip or flag bad ones,
          then run research to extract new data.
        </p>
        <SourceManagementTable sources={sourceSummaries} parkId={parkId} />
      </section>

      {/* Domain reliability (supporting context) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Domain Reliability</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Global reliability settings that influence how much the AI trusts each domain across all parks.
        </p>
        <DomainReliabilityTable domains={domainSummaries} />
      </section>
    </div>
  );
}

function ResearchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEEDS_RESEARCH: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50",
    IN_PROGRESS: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50",
    PARTIAL: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
    RESEARCHED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900/50",
    MAINTENANCE: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-muted text-foreground border-border"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
