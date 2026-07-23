"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Building2, KeyRound, type LucideIcon } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
};

const TABS: Tab[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/operators", label: "Operators", icon: Building2 },
  { href: "/admin/pre-grants", label: "Pre-grants", icon: KeyRound, superAdminOnly: true },
];

/**
 * Shared header + tab bar for the People & Access section (Users, Operators,
 * Pre-grants). Pre-grants is SUPER_ADMIN-only. Rendered at the top of each of
 * the three pages so they read as one section.
 */
export function PeopleTabs({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((t) => !t.superAdminOnly || isSuperAdmin);

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground mb-1">People &amp; Access</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Manage user roles, operator accounts, and pre-granted access.
      </p>
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="People sections">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
