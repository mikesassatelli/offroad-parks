import { prisma } from "@/lib/prisma";
import { MapPin, Clock, CheckCircle, XCircle } from "lucide-react";

export default async function AdminDashboard() {
  // Fetch statistics
  const [totalParks, pendingParks, approvedParks, rejectedParks, totalUsers] =
    await Promise.all([
      prisma.park.count(),
      prisma.park.count({ where: { status: "PENDING" } }),
      prisma.park.count({ where: { status: "APPROVED" } }),
      prisma.park.count({ where: { status: "REJECTED" } }),
      prisma.user.count(),
    ]);

  // Get recent pending parks
  const recentPendingParks = await prisma.park.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      createdAt: true,
      submitterName: true,
    },
  });

  const stats = [
    {
      name: "Total Parks",
      value: totalParks,
      icon: MapPin,
      color: "bg-blue-500",
    },
    {
      name: "Pending Approval",
      value: pendingParks,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      name: "Approved",
      value: approvedParks,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      name: "Rejected",
      value: rejectedParks,
      icon: XCircle,
      color: "bg-red-500",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} rounded-full p-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Pending Parks */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Pending Parks
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentPendingParks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No pending parks to review
            </div>
          ) : (
            recentPendingParks.map((park) => (
              <div
                key={park.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {park.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {park.city ? `${park.city}, ` : ""}
                      {park.state}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted by: {park.submitterName || "Anonymous"} •{" "}
                      {new Date(park.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={`/admin/parks?highlight=${park.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Review
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Stats */}
      <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          User Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
