import { prisma } from "@/lib/prisma";
import { Camera, CheckCircle, Clock, MapPin, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function AdminDashboard() {
  // Fetch statistics
  const [totalParks, pendingParks, totalUsers, pendingPhotos, pendingReviews] =
    await Promise.all([
      prisma.park.count(),
      prisma.park.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.parkPhoto.count({ where: { status: "PENDING" } }),
      prisma.parkReview.count({ where: { status: "PENDING" } }),
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

  // Get recent photos (all statuses)
  const recentPhotos = await prisma.parkPhoto.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      park: {
        select: {
          name: true,
          slug: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
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
      name: "Pending Parks",
      value: pendingParks,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      name: "Pending Photos",
      value: pendingPhotos,
      icon: Camera,
      color: "bg-purple-500",
    },
    {
      name: "Pending Reviews",
      value: pendingReviews,
      icon: MessageSquare,
      color: "bg-orange-500",
    },
    {
      name: "Total Users",
      value: totalUsers,
      icon: CheckCircle,
      color: "bg-green-500",
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

      {/* Recent Photos */}
      <div className="mt-8 bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Recent Photos</h2>
          <Link
            href="/admin/photos"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="p-6">
          {recentPhotos.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No photos uploaded yet
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  href={`/parks/${photo.park.slug}`}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-colors"
                >
                  <Image
                    src={photo.url}
                    alt={
                      /* v8 ignore next - Simple null coalescing for display text */
                      photo.caption || "Park photo"
                    }
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="text-sm font-medium truncate">
                        {photo.park.name}
                      </p>
                      <p className="text-xs opacity-90">
                        {
                          /* v8 ignore next - Display text only, all statuses tested via E2E */
                          photo.status === "PENDING"
                            ? "⏳ Pending"
                            : /* v8 ignore next */
                              photo.status === "APPROVED"
                              ? "✓ Approved"
                              : /* v8 ignore next */
                                photo.status === "REJECTED"
                                ? "✗ Rejected"
                                : null
                        }
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
