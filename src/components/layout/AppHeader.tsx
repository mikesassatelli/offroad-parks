"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  CircleUser,
  Info,
  Mail,
  MessageSquare,
  PlusCircle,
  Route,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "./UserMenu";
import { MobileTabBar } from "./MobileTabBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { signOut } from "next-auth/react";

interface AppHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
  /** Show back to parks button */
  showBackButton?: boolean;
}

export function AppHeader({ user, showBackButton }: AppHeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // "Back to Parks" returns to the browse view the user last had open (filters
  // + map/list mode), which OffroadParksApp stashes in sessionStorage. Read at
  // click time (SSR-safe, always fresh); href="/" stays as the fallback and for
  // modified clicks (cmd/ctrl/middle → open the bare list in a new tab). Scroll
  // + pagination are restored by OffroadParksApp on arrival.
  const handleBackToParks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    try {
      const stored = window.sessionStorage.getItem("parks:returnUrl");
      if (stored && stored !== "/") {
        e.preventDefault();
        router.push(stored);
      }
    } catch {
      /* sessionStorage unavailable — fall through to the default href="/" */
    }
  };

  return (
    <>
      <header className="bg-card/95 backdrop-blur-sm border-b border-border shadow-sm z-20">
      <div className="max-w-7xl 2xl:max-w-[1800px] 3xl:max-w-[2400px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
        {showBackButton && (
          <Button asChild variant="ghost" size="sm" className="mr-1 sm:mr-2">
            <Link
              href="/"
              onClick={handleBackToParks}
              className="flex items-center gap-2"
              aria-label="Back to Parks"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Parks</span>
            </Link>
          </Button>
        )}
        <Link
          href="/"
          className="text-base sm:text-xl font-extrabold uppercase tracking-wide sm:tracking-widest text-foreground hover:text-primary transition-colors whitespace-nowrap"
        >
          Offroad Parks
        </Link>
        <span className="ml-1 hidden sm:inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25 font-bold uppercase tracking-wider">
          beta
        </span>
        {/* Desktop nav — hidden on mobile, moved into the sheet below.
            Product destinations sit directly on the bar; the "More" menu holds
            only company/marketing pages. */}
        <nav className="ml-auto hidden items-center gap-3 lg:flex">
          {/* Product nav — always available */}
          <Button asChild variant="ghost" size="sm">
            <Link href="/reviews" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Park Reviews
            </Link>
          </Button>

          <Button asChild variant="ghost" size="sm">
            <Link href="/submit" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Submit Park
            </Link>
          </Button>

          {/* Personal nav — signed-in destinations */}
          {user && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/routes" className="flex items-center gap-2">
                  <Route className="w-4 h-4" />
                  Saved Routes
                </Link>
              </Button>

              <Button asChild variant="ghost" size="sm">
                <Link href="/profile" className="flex items-center gap-2">
                  <CircleUser className="w-4 h-4" />
                  My Profile
                </Link>
              </Button>
            </>
          )}

          {/* Company / marketing — overflow only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                More
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/for-operators" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  For Operators
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/about" className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  About
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/contact" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right-side controls: theme stays visible at every size. On mobile
            the ml-auto lives here since the desktop nav is hidden. */}
        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          {/* Submit is an occasional action — a compact icon button on mobile
              rather than a bottom-nav tab (signed-in only; the page is gated). */}
          {user && (
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
            >
              <Link href="/submit" aria-label="Submit a park">
                <PlusCircle className="w-5 h-5" />
              </Link>
            </Button>
          )}

          <ThemeToggle />

          {/* Auth entry points move into the bottom tab bar on mobile (Account
              sheet when signed in, Sign in tab when signed out), so both are
              hidden below lg here. */}
          {user ? (
            <div className="hidden lg:block">
              <UserMenu user={user} onSignOut={handleSignOut} />
            </div>
          ) : (
            <div className="hidden lg:block">
              <LoginDialog />
            </div>
          )}
        </div>
      </div>
      </header>

      <MobileTabBar user={user} onSignOut={handleSignOut} />
    </>
  );
}
