import { prisma } from "@/lib/prisma";
import type { DataSourceSummary, DomainReliabilitySummary } from "@/lib/types";
import { SourceManagementTable } from "@/components/admin/SourceManagementTable";
import { DomainReliabilityTable } from "@/components/admin/DomainReliabilityTable";

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ parkId?: string }>;
}) {
  const { parkId } = await searchParams;

  // Fetch domain reliability entries for the top section
  const domainEntries = await prisma.domainReliability.findMany({
    orderBy: { defaultReliability: "desc" },
  });

  const domainSummaries: DomainReliabilitySummary[] = domainEntries.map((d) => ({
    id: d.id,
    domainPattern: d.domainPattern,
    defaultReliability: d.defaultReliability,
    isBlocked: d.isBlocked,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
  }));

  // If no parkId, show park list for selection
  if (!parkId) {
    const parks = await prisma.park.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        slug: true,
        address: { select: { state: true } },
        researchStatus: true,
        _count: { select: { dataSources: true } },
      },
      orderBy: { name: "asc" },
    });

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>

        {/* Domain Reliability Section */}
        <DomainReliabilityTable domains={domainSummaries} />

        <hr className="border-gray-200" />

        <p className="text-sm text-gray-500">Select a park to manage its data sources.</p>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Park</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Research Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sources</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {parks.map((park) => (
                <tr key={park.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/ai-research/sources?parkId=${park.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {park.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{park.address?.state}</td>
                  <td className="px-4 py-3">
                    <ResearchStatusBadge status={park.researchStatus} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{park._count.dataSources}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Show sources for specific park
  const park = await prisma.park.findUnique({
    where: { id: parkId },
    select: { id: true, name: true, slug: true },
  });

  if (!park) {
    return <div className="text-red-600">Park not found.</div>;
  }

  const sources = await prisma.dataSource.findMany({
    where: { parkId },
    orderBy: [{ reliability: "desc" }, { createdAt: "desc" }],
  });

  const summaries: DataSourceSummary[] = sources.map((s) => ({
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

  return (
    <div className="space-y-6">
      <div>
        <a href="/admin/ai-research/sources" className="text-sm text-blue-600 hover:text-blue-800">&larr; All Parks</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Sources: {park.name}</h1>
      </div>

      {/* Domain Reliability Section */}
      <DomainReliabilityTable domains={domainSummaries} />

      <hr className="border-gray-200" />

      <SourceManagementTable sources={summaries} parkId={parkId} />
    </div>
  );
}

function ResearchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEEDS_RESEARCH: "bg-red-100 text-red-800 border-red-200",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
    RESEARCHED: "bg-green-100 text-green-800 border-green-200",
    MAINTENANCE: "bg-blue-100 text-blue-800 border-blue-200",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
