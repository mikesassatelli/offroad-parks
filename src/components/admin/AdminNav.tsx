"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BrainCircuit,
  Building2,
  Camera,
  ClipboardList,
  Home,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquare,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
};

// AI Research is near the top — it's the backbone of the app. Its sub-pages
// (Discover/Research/Review) are reached via the in-page tab bar, so they're no
// longer duplicated here.
const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/ai-research", label: "AI Research", icon: BrainCircuit },
  { href: "/admin/parks", label: "Parks", icon: MapPin },
  { href: "/admin/photos", label: "Photos", icon: Camera },
  { href: "/admin/photos/bulk-upload", label: "Bulk Photo Upload", icon: Upload },
  { href: "/admin/conditions", label: "Trail Conditions", icon: Activity },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/claims", label: "Park Claims", icon: ClipboardList },
  { href: "/admin/operators", label: "Park Operators", icon: Building2 },
  { href: "/admin/map-heroes", label: "Map Heroes", icon: ImageIcon },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/pre-grants", label: "Pre-grants", icon: KeyRound, superAdminOnly: true },
];

function NavList({
  items,
  activeHref,
  onNavigate,
}: {
  items: NavItem[];
  activeHref: string | undefined;
  onNavigate: () => void;
}) {
  return (
    <nav className="p-4 space-y-1">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-4 py-2.5 text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Home className="w-5 h-5" />
        <span className="font-medium">Return to Homepage</span>
      </Link>
      <div className="border-t border-border my-2" />
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              active
                ? "bg-primary/10 text-primary font-semibold"
                : "text-foreground hover:bg-accent hover:text-accent-foreground font-medium"
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV_ITEMS.filter((i) => !i.superAdminOnly || isSuperAdmin);

  // Most-specific match wins, so "/admin/parks/new" highlights Add Park (not Parks).
  const activeHref = items
    .map((i) => i.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <>
      {/* Mobile top bar with hamburger (hidden on desktop) */}
      <div className="md:hidden flex items-center gap-3 border-b border-border bg-card px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-foreground">Admin menu</span>
      </div>

      {/* Persistent desktop sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 bg-card border-r border-border min-h-[calc(100vh-4rem)]">
        <NavList items={items} activeHref={activeHref} onNavigate={() => setOpen(false)} />
      </aside>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-card border-r border-border overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-foreground">Admin menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavList items={items} activeHref={activeHref} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
