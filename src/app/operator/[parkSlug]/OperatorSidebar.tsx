"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  Camera,
  Image,
  MapPin,
  Megaphone,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

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
    { href: `/operator/${parkSlug}/alerts${fromParam}`, label: "Alerts", icon: Megaphone },
    { href: `/operator/${parkSlug}/settings${fromParam}`, label: "Park Details", icon: MapPin },
    { href: `/operator/${parkSlug}/park-card${fromParam}`, label: "Park Card", icon: Image },
    { href: `/operator/${parkSlug}/photos${fromParam}`, label: "Photos", icon: Camera },
    { href: `/operator/${parkSlug}/reviews${fromParam}`, label: "Reviews", icon: MessageSquare },
    { href: `/operator/${parkSlug}/moderation/conditions${fromParam}`, label: "Condition Reports", icon: ShieldAlert },
  ];

  return (
    <nav className="p-4 space-y-2">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Icon className="w-5 h-5" />
          <span className="font-medium">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
