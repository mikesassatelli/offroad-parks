import { prisma } from "@/lib/prisma";
import { ParkManagementTable } from "@/components/admin/ParkManagementTable";

interface SearchParams {
  status?: string;
  highlight?: string;
}

export default async function AdminParksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || "all";

  // Build where clause based on status filter
  const whereClause =
    statusFilter === "all"
      ? {}
      : {
          status: statusFilter.toUpperCase() as
            | "PENDING"
            | "APPROVED"
            | "REJECTED"
            | "DRAFT",
        };

  // Fetch parks with their relations
  const parks = await prisma.park.findMany({
    where: whereClause,
    include: {
      terrain: true,
      difficulty: true,
      amenities: true,
      vehicleTypes: true,
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Park Management</h1>
        <a
          href="/admin/parks/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Add New Park
        </a>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" },
            { label: "Draft", value: "draft" },
          ].map((tab) => (
            <a
              key={tab.value}
              href={`/admin/parks?status=${tab.value}`}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                statusFilter === tab.value
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs text-gray-400">
                {
                  parks.filter((p) =>
                    tab.value === "all"
                      ? true
                      : p.status === tab.value.toUpperCase(),
                  ).length
                }
              </span>
            </a>
          ))}
        </nav>
      </div>

      {/* Parks Table */}
      <ParkManagementTable parks={parks} highlightId={params.highlight} />
    </div>
  );
}
