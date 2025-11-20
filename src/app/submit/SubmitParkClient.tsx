"use client";

import { SessionProvider } from "next-auth/react";
import { AppHeader } from "@/components/layout/AppHeader";

interface SubmitParkClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  children: React.ReactNode;
}

export function SubmitParkClient({ user, children }: SubmitParkClientProps) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-20">
          <AppHeader user={user} showBackButton />
        </div>
        {children}
      </div>
    </SessionProvider>
  );
}
