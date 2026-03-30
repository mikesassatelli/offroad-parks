import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { getOperatorContext } from "@/lib/operator-auth";
import {
  Activity,
  BarChart3,
  Home,
  LogOut,
  MapPin,
  Settings,
} from "lucide-react";

interface OperatorLayoutProps {
  children: React.ReactNode;
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorLayout({
  children,
  params,
}: OperatorLayoutProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);

  if (!ctx) {
    // Not an operator for this park — redirect home
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Operator Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-gray-500 leading-none">Operator Portal</p>
                <h1 className="text-base font-semibold text-gray-900 leading-tight">
                  {ctx.parkName}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{ctx.operatorName}</span>
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
        <aside className="w-56 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Public Site</span>
            </Link>
            <Link
              href={`/parks/${parkSlug}`}
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span>View Park Listing</span>
            </Link>
            <div className="border-t border-gray-100 my-2" />
            <Link
              href={`/operator/${parkSlug}/dashboard`}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href={`/operator/${parkSlug}/conditions`}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Trail Status</span>
            </Link>
            <Link
              href={`/operator/${parkSlug}/settings`}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Park Settings</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
