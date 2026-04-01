import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Suspense } from "react";
import { getOperatorContext } from "@/lib/operator-auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { OperatorBreadcrumb } from "./OperatorBreadcrumb";
import { OperatorSidebar } from "./OperatorSidebar";

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
            <span className="text-sm text-gray-600 dark:text-gray-400">← Manage Parks</span>
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
          <Suspense fallback={null}>
            <OperatorSidebar parkSlug={parkSlug} />
          </Suspense>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
