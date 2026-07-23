import { prisma } from "@/lib/prisma";
import { ParkManagementTable } from "@/components/admin/ParkManagementTable";
import type { Prisma, ParkStatus } from "@prisma/client";
import { Plus, Upload } from "lucide-react";

interface SearchParams {
  status?: string;
  highlight?: string;
  page?: string;
  search?: string;
}

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Draft", value: "draft" },
] as const;

export default async function AdminParksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || "all";
  const searchTerm = (params.search ?? "").trim();

  // Search runs in the DB (name / city / state) so it spans ALL parks, not just
  // the current page. Kept separate from the status filter so the tab badges
  // below can reflect the active search too.
  const searchWhere: Prisma.ParkWhereInput = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          {
            address: {
              is: { city: { contains: searchTerm, mode: "insensitive" } },
            },
          },
          {
            address: {
              is: { state: { contains: searchTerm, mode: "insensitive" } },
            },
          },
        ],
      }
    : {};

  // Combine the status and search filters, keeping the clause minimal: `{}`
  // when unfiltered, a bare status/search clause when only one is active, and
  // an AND only when both apply.
  const conditions: Prisma.ParkWhereInput[] = [];
  if (statusFilter !== "all") {
    conditions.push({
      status: statusFilter.toUpperCase() as
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "DRAFT",
    });
  }
  if (searchTerm) conditions.push(searchWhere);

  const whereClause: Prisma.ParkWhereInput =
    conditions.length === 0
      ? {}
      : conditions.length === 1
        ? conditions[0]
        : { AND: conditions };

  // Total count for the current filter, used to compute pagination bounds.
  const totalCount = await prisma.park.count({ where: whereClause });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, requestedPage), totalPages)
    : 1;
  const skip = (currentPage - 1) * PAGE_SIZE;

  // Counts per status tab, independent of the current page/status filter so
  // the tab badges always reflect the true totals rather than just what's
  // on the current page.
  const statusCounts = await prisma.park.groupBy({
    by: ["status"],
    where: searchWhere,
    _count: { _all: true },
  });
  const countsByStatus = new Map<ParkStatus, number>(
    statusCounts.map((entry) => [entry.status, entry._count._all]),
  );
  const allParksCount = statusCounts.reduce(
    (sum, entry) => sum + entry._count._all,
    0,
  );

  // Fetch parks with their relations
  const parks = await prisma.park.findMany({
    where: whereClause,
    include: {
      terrain: true,
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      photos: {
        where: { status: "APPROVED" },
        select: { id: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    skip,
    take: PAGE_SIZE,
  });

  // Preserve existing query params (e.g. status) while overriding others
  // (e.g. page) so pagination composes with any other filters on this page.
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    if (statusFilter !== "all") query.set("status", statusFilter);
    if (searchTerm) query.set("search", searchTerm);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        query.delete(key);
      } else {
        query.set(key, value);
      }
    }
    const qs = query.toString();
    return qs ? `/admin/parks?${qs}` : "/admin/parks";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Park Management
        </h1>
        <div className="flex items-center gap-2">
          <a
            href="/admin/parks/bulk-upload"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border bg-card text-foreground rounded-lg hover:bg-accent transition-colors font-medium"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </a>
          <a
            href="/admin/parks/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add New Park
          </a>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6 border-b border-border">
        <nav className="flex space-x-8">
          {STATUS_TABS.map((tab) => (
            <a
              key={tab.value}
              href={buildHref({
                status: tab.value === "all" ? undefined : tab.value,
                page: undefined,
              })}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                statusFilter === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs text-muted-foreground">
                {tab.value === "all"
                  ? allParksCount
                  : (countsByStatus.get(
                      tab.value.toUpperCase() as ParkStatus,
                    ) ?? 0)}
              </span>
            </a>
          ))}
        </nav>
      </div>

      {/* Parks Table */}
      <ParkManagementTable
        parks={parks}
        highlightId={params.highlight}
        statusFilter={statusFilter}
        initialSearch={searchTerm}
      />

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, totalCount)} of{" "}
            {totalCount} parks
          </p>
          <div className="flex items-center gap-4">
            {currentPage > 1 ? (
              <a
                href={buildHref({ page: String(currentPage - 1) })}
                className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-accent transition-colors"
              >
                Previous
              </a>
            ) : (
              <span className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg text-muted-foreground opacity-50 cursor-not-allowed">
                Previous
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages ? (
              <a
                href={buildHref({ page: String(currentPage + 1) })}
                className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg text-foreground hover:bg-accent transition-colors"
              >
                Next
              </a>
            ) : (
              <span className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg text-muted-foreground opacity-50 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
