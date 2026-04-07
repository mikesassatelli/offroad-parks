import { prisma } from "@/lib/prisma";
import { ParkDiscoveryTable } from "@/components/admin/ParkDiscoveryTable";
import type { ParkCandidateStatus, ParkCandidateSummary } from "@/lib/types";

export default async function ParkDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; state?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || "PENDING";

  const where: { status?: ParkCandidateStatus; state?: string } = {};
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter as ParkCandidateStatus;
  }
  if (params.state) {
    where.state = params.state.toUpperCase();
  }

  const [candidates, totalAll, totalPending, totalAccepted, totalRejected] =
    await Promise.all([
      prisma.parkCandidate.findMany({
        where,
        orderBy: [{ state: "asc" }, { name: "asc" }],
      }),
      prisma.parkCandidate.count(),
      prisma.parkCandidate.count({ where: { status: "PENDING" } }),
      prisma.parkCandidate.count({ where: { status: "ACCEPTED" } }),
      prisma.parkCandidate.count({ where: { status: "REJECTED" } }),
    ]);

  const summaries: ParkCandidateSummary[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    state: c.state,
    city: c.city,
    estimatedLat: c.estimatedLat,
    estimatedLng: c.estimatedLng,
    sourceUrl: c.sourceUrl,
    status: c.status as ParkCandidateStatus,
    rejectedReason: c.rejectedReason,
    seededParkId: c.seededParkId,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Park Discovery</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review AI-discovered park candidates and seed them into the database.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Candidates" value={totalAll} />
        <StatCard label="Pending" value={totalPending} color="gray" />
        <StatCard label="Accepted" value={totalAccepted} color="green" />
        <StatCard label="Rejected" value={totalRejected} color="red" />
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        <StatusFilterLink
          href="/admin/ai-research/discovery"
          label="All"
          active={statusFilter === "ALL"}
        />
        <StatusFilterLink
          href="/admin/ai-research/discovery?status=PENDING"
          label="Pending"
          active={statusFilter === "PENDING"}
        />
        <StatusFilterLink
          href="/admin/ai-research/discovery?status=ACCEPTED"
          label="Accepted"
          active={statusFilter === "ACCEPTED"}
        />
        <StatusFilterLink
          href="/admin/ai-research/discovery?status=REJECTED"
          label="Rejected"
          active={statusFilter === "REJECTED"}
        />
      </div>

      <ParkDiscoveryTable candidates={summaries} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "gray" | "green" | "red";
}) {
  const colorStyles = {
    gray: "text-gray-900",
    green: "text-green-700",
    red: "text-red-700",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${color ? colorStyles[color] : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusFilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </a>
  );
}
