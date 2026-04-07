import { prisma } from "@/lib/prisma";

/**
 * Update the accuracy metrics for a DataSource after an approve/reject action.
 * Also aggregates accuracy at the domain level into DomainReliability.
 */
export async function recordFeedback(
  dataSourceId: string,
  action: "approve" | "reject"
): Promise<void> {
  // 1. Increment the appropriate counter on the DataSource
  const updated = await prisma.dataSource.update({
    where: { id: dataSourceId },
    data:
      action === "approve"
        ? { approveCount: { increment: 1 } }
        : { rejectCount: { increment: 1 } },
  });

  // Domain-level accuracy is computed at display time via getDomainAccuracyStats().
  // We don't auto-update DomainReliability — admin decides based on the dashboard.
  void updated;
}

/**
 * Query all DataSources, group by hostname, compute accuracy per domain.
 * Return top 20 by total reviews descending.
 */
export async function getDomainAccuracyStats(): Promise<
  Array<{
    domain: string;
    totalApproves: number;
    totalRejects: number;
    accuracy: number;
    sourceCount: number;
  }>
> {
  const sources = await prisma.dataSource.findMany({
    select: { url: true, approveCount: true, rejectCount: true },
  });

  // Group by hostname
  const domainMap = new Map<
    string,
    { totalApproves: number; totalRejects: number; sourceCount: number }
  >();

  for (const s of sources) {
    let hostname: string;
    try {
      const parsed = new URL(s.url);
      hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      continue; // skip invalid URLs
    }

    const existing = domainMap.get(hostname);
    if (existing) {
      existing.totalApproves += s.approveCount;
      existing.totalRejects += s.rejectCount;
      existing.sourceCount += 1;
    } else {
      domainMap.set(hostname, {
        totalApproves: s.approveCount,
        totalRejects: s.rejectCount,
        sourceCount: 1,
      });
    }
  }

  // Convert to array, compute accuracy, sort by total reviews descending, take top 20
  const results = Array.from(domainMap.entries())
    .map(([domain, stats]) => {
      const total = stats.totalApproves + stats.totalRejects;
      return {
        domain,
        totalApproves: stats.totalApproves,
        totalRejects: stats.totalRejects,
        accuracy: total > 0 ? stats.totalApproves / total : 0,
        sourceCount: stats.sourceCount,
      };
    })
    .filter((r) => r.totalApproves + r.totalRejects > 0)
    .sort((a, b) => {
      const totalA = a.totalApproves + a.totalRejects;
      const totalB = b.totalApproves + b.totalRejects;
      return totalB - totalA;
    })
    .slice(0, 20);

  return results;
}
