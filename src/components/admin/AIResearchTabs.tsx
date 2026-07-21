"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, FlaskConical, ClipboardCheck } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Match sub-routes (e.g. /research/[parkId]) as active too. */
  matchPrefix?: boolean;
};

const TABS: Tab[] = [
  { href: "/admin/ai-research", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/ai-research/discovery", label: "Discover", icon: Search, matchPrefix: true },
  { href: "/admin/ai-research/research", label: "Research", icon: FlaskConical, matchPrefix: true },
  { href: "/admin/ai-research/review", label: "Review", icon: ClipboardCheck, matchPrefix: true },
];

export function AIResearchTabs({ pendingReviewCount }: { pendingReviewCount?: number }) {
  const pathname = usePathname();

  const isActive = (tab: Tab) => {
    if (tab.matchPrefix) return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    return pathname === tab.href;
  };

  return (
    <div className="border-b border-border">
      <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="AI Research sections">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const showBadge = tab.label === "Review" && (pendingReviewCount ?? 0) > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {showBadge && (
                <span className="inline-flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold px-2 py-0.5 min-w-[1.25rem]">
                  {pendingReviewCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
