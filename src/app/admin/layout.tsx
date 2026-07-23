import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogOut } from "lucide-react";

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
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    redirect("/");
  }
  const isSuperAdmin = userRole === "SUPER_ADMIN";

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
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[40vw]">
                {session.user.email}
              </span>
              <ThemeToggle />
              <Link
                href="/api/auth/signout"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="md:flex max-w-7xl mx-auto">
        <AdminNav isSuperAdmin={isSuperAdmin} />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
