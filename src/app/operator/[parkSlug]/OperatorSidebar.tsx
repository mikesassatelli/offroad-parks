"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, BarChart3, Settings } from "lucide-react";

interface OperatorSidebarProps {
  parkSlug: string;
}

export function OperatorSidebar({ parkSlug }: OperatorSidebarProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const fromParam = from ? `?from=${from}` : "";

  const links = [
    { href: `/operator/${parkSlug}/dashboard${fromParam}`, label: "Dashboard", icon: BarChart3 },
    { href: `/operator/${parkSlug}/conditions${fromParam}`, label: "Trail Status", icon: Activity },
    { href: `/operator/${parkSlug}/settings${fromParam}`, label: "Park Settings", icon: Settings },
  ];

  return (
    <nav className="p-3 space-y-0.5">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          <Icon className="w-4 h-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
