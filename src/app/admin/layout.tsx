import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Settings,
  LogOut,
  PlusCircle,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {session.user.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              href="/admin/parks"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              <span className="font-medium">Parks</span>
            </Link>
            <Link
              href="/admin/parks/new"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span className="font-medium">Add Park</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Users</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
