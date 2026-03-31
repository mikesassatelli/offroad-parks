import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Suspense } from "react";
import { getOperatorContext } from "@/lib/operator-auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { OperatorBreadcrumb } from "./OperatorBreadcrumb";
import { Activity, BarChart3, Settings } from "lucide-react";

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
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={session.user} />

      {/* Breadcrumb + park context bar */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
          <Suspense fallback={
            <Link href="/operator" className="inline-flex items-center gap-1 text-sm text-gray-600">
              ← Manage Parks
            </Link>
          }>
            <OperatorBreadcrumb parkName={ctx.parkName} parkSlug={ctx.parkSlug} />
          </Suspense>
          <span className="text-xs text-muted-foreground">
            {ctx.parkName} · Operator Portal
          </span>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-52 border-r border-border bg-card min-h-[calc(100vh-7rem)] flex-shrink-0">
          <nav className="p-3 space-y-0.5">
            <Link
              href={`/operator/${parkSlug}/dashboard`}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href={`/operator/${parkSlug}/conditions`}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <Activity className="w-4 h-4" />
              Trail Status
            </Link>
            <Link
              href={`/operator/${parkSlug}/settings`}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
              Park Settings
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
