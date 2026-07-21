"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ArrowLeft, CircleUser, MessageSquare, Menu, PlusCircle } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "./UserMenu";
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu if the viewport grows to desktop, where its trigger
  // is hidden and the links render inline.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const closeIfDesktop = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", closeIfDesktop);
    return () => mq.removeEventListener("change", closeIfDesktop);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border shadow-sm z-20">
      <div className="max-w-7xl 2xl:max-w-[1800px] 3xl:max-w-[2400px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
        {showBackButton && (
          <Button asChild variant="ghost" size="sm" className="mr-1 sm:mr-2">
            <Link href="/" className="flex items-center gap-2" aria-label="Back to Parks">
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
        {/* Desktop nav — hidden on mobile, moved into the sheet below */}
        <nav className="ml-auto hidden items-center gap-3 lg:flex">
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

          {user && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/profile" className="flex items-center gap-2">
                <CircleUser className="w-4 h-4" />
                My Profile
              </Link>
            </Button>
          )}
        </nav>

        {/* Right-side controls: theme + auth stay visible at every size. On
            mobile the ml-auto lives here since the desktop nav is hidden. */}
        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <ThemeToggle />

          {user ? (
            <UserMenu user={user} onSignOut={handleSignOut} />
          ) : (
            <LoginDialog />
          )}

          {/* Mobile menu — surfaces the nav links hidden above */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon-sm" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-2">
                <SheetClose asChild>
                  <Button asChild variant="ghost" className="justify-start">
                    <Link href="/reviews" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Park Reviews
                    </Link>
                  </Button>
                </SheetClose>

                <SheetClose asChild>
                  <Button asChild variant="ghost" className="justify-start">
                    <Link href="/submit" className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Submit Park
                    </Link>
                  </Button>
                </SheetClose>

                {user && (
                  <SheetClose asChild>
                    <Button asChild variant="ghost" className="justify-start">
                      <Link href="/profile" className="flex items-center gap-2">
                        <CircleUser className="w-4 h-4" />
                        My Profile
                      </Link>
                    </Button>
                  </SheetClose>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
