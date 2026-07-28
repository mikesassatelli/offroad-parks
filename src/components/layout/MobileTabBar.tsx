"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CircleUser,
  Info,
  type LucideIcon,
  LogOut,
  LogIn,
  Mail,
  MapPin,
  MessageSquare,
  Route,
  Settings,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
  onSignOut: () => void;
}

/**
 * Mobile primary navigation. A fixed bottom tab bar that replaces the hamburger
 * sheet below the `lg` breakpoint (where the desktop inline nav takes over).
 *
 * All tabs carry equal weight — they're the destinations users move between,
 * so Submit (an occasional, sign-in-gated contribution action) is not a tab;
 * it lives as a compact button in the header instead. Saved and Account are
 * signed-in only; signed-out users get a Sign in CTA in that space, since it
 * unlocks everything gated. Account opens a bottom sheet carrying the
 * personal/account links that don't warrant their own tab.
 */
export function MobileTabBar({ user, onSignOut }: MobileTabBarProps) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Account has no route of its own — highlight it while on any of the
  // destinations reachable from its sheet.
  const accountActive = ["/profile", "/admin", "/operator"].some((p) =>
    pathname.startsWith(p),
  );

  // Role gating copied from UserMenu so the sheet surfaces the same links.
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canViewAdmin = isAdmin || user?.role === "BETA_TESTER";
  const showManageParks =
    (canViewAdmin || user?.role === "OPERATOR") && user?.role !== "BETA_TESTER";

  const columns = user ? 4 : 3;

  return (
    <>
      <nav
        aria-label="Primary"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        <div
          className="grid items-stretch"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          <TabLink
            href="/"
            label="Browse"
            icon={MapPin}
            active={isActive("/")}
          />

          <TabLink
            href="/reviews"
            label="Reviews"
            icon={MessageSquare}
            active={isActive("/reviews")}
          />

          {user ? (
            <>
              <TabLink
                href="/routes"
                label="Saved"
                icon={Route}
                active={isActive("/routes")}
              />

              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                aria-label="Account menu"
                aria-haspopup="dialog"
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  accountActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <User className="h-5 w-5" />
                <span>Account</span>
              </button>
            </>
          ) : (
            <LoginDialog
              trigger={
                <button
                  type="button"
                  aria-label="Sign in"
                  className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-primary transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Sign in</span>
                </button>
              }
            />
          )}
        </div>
      </nav>

      {user && (
        <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="text-left">
              <SheetTitle>{user.name || "Account"}</SheetTitle>
              {user.email && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
            </SheetHeader>

            <nav className="flex flex-col gap-1 px-2 pb-[env(safe-area-inset-bottom)]">
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/profile" className="flex items-center gap-2">
                    <CircleUser className="h-4 w-4" />
                    My Profile
                  </Link>
                </Button>
              </SheetClose>

              {canViewAdmin && (
                <SheetClose asChild>
                  <Button asChild variant="ghost" className="justify-start">
                    <Link href="/admin" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  </Button>
                </SheetClose>
              )}

              {showManageParks && (
                <SheetClose asChild>
                  <Button asChild variant="ghost" className="justify-start">
                    <Link href="/operator" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Manage Parks
                    </Link>
                  </Button>
                </SheetClose>
              )}

              <div className="my-1 border-t border-border" />

              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/for-operators" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    For Operators
                  </Link>
                </Button>
              </SheetClose>

              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/about" className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    About
                  </Link>
                </Button>
              </SheetClose>

              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/contact" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact
                  </Link>
                </Button>
              </SheetClose>

              <div className="my-1 border-t border-border" />

              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  setAccountOpen(false);
                  onSignOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
