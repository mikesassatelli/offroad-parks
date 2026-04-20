import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Activity,
  BrainCircuit,
  Camera,
  ClipboardCheck,
  ClipboardList,
  Globe,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  PlusCircle,
  Search,
  Upload,
  Users,
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Admin Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-foreground">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {session.user.email}
              </span>
              <ThemeToggle />
              <Link
                href="/api/auth/signout"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
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
        <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Return to Homepage</span>
            </Link>
            <div className="border-t border-border my-2"></div>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              href="/admin/parks"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <MapPin className="w-5 h-5" />
              <span className="font-medium">Parks</span>
            </Link>
            <Link
              href="/admin/parks/new"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span className="font-medium">Add Park</span>
            </Link>
            <Link
              href="/admin/parks/bulk-upload"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">Bulk Upload</span>
            </Link>
            <Link
              href="/admin/photos"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span className="font-medium">Photos</span>
            </Link>
            <Link
              href="/admin/photos/bulk-upload"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors pl-8"
            >
              <Upload className="w-4 h-4" />
              <span className="font-medium text-sm">Bulk Photo Upload</span>
            </Link>

            <Link
              href="/admin/conditions"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Activity className="w-5 h-5" />
              <span className="font-medium">Trail Conditions</span>
            </Link>
            <Link
              href="/admin/reviews"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Reviews</span>
            </Link>
            <Link
              href="/admin/claims"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ClipboardList className="w-5 h-5" />
              <span className="font-medium">Park Claims</span>
            </Link>
            <Link
              href="/admin/map-heroes"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="font-medium">Map Heroes</span>
            </Link>
            <div className="border-t border-border my-2"></div>
            <Link
              href="/admin/ai-research"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <BrainCircuit className="w-5 h-5" />
              <span className="font-medium">AI Research</span>
            </Link>
            <Link
              href="/admin/ai-research/pending"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors pl-8"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="font-medium text-sm">Review Queue</span>
            </Link>
            <Link
              href="/admin/ai-research/sources"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors pl-8"
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium text-sm">Sources</span>
            </Link>
            <Link
              href="/admin/ai-research/discovery"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors pl-8"
            >
              <Search className="w-4 h-4" />
              <span className="font-medium text-sm">Park Discovery</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-4 py-3 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Users</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
