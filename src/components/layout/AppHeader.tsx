"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, CircleUser, LogIn, MessageSquare, PlusCircle } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { signIn, signOut } from "next-auth/react";

interface AppHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  } | null;
  /** Show back to parks button */
  showBackButton?: boolean;
}

export function AppHeader({ user, showBackButton }: AppHeaderProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border shadow-sm z-20">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-3">
        {showBackButton && (
          <Button asChild variant="ghost" size="sm" className="mr-2">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Parks
            </Link>
          </Button>
        )}
        <Link href="/" className="text-2xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity">
          🏞️ UTV Parks
        </Link>
        <span className="ml-1 inline-flex items-center text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
          beta
        </span>
        <div className="ml-auto flex items-center gap-3">
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
        </div>

        <div className="ml-8">
          {user ? (
            <UserMenu user={user} onSignOut={handleSignOut} />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => signIn("google")}
              className="gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
