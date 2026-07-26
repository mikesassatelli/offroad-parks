"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { LockedGate } from "@/components/LockedGate";
import { useSignInPrompt } from "@/components/auth/SignInPromptProvider";

const DESCRIPTION =
  "Sign in to submit a park and help the community grow the map.";

/**
 * Shown on /submit when a signed-out visitor lands there (via the "Submit Park"
 * nav, footer, or a direct link). Instead of bouncing them to the native
 * NextAuth page, it pops the themed sign-in dialog on arrival and leaves an
 * on-brand CTA behind it so they can reopen it if dismissed.
 */
export function SubmitSignInGate() {
  const { promptSignIn } = useSignInPrompt();

  // Pop the sign-in dialog as soon as they arrive.
  useEffect(() => {
    promptSignIn({ description: DESCRIPTION });
  }, [promptSignIn]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader showBackButton />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center flex flex-col items-center">
          <LockedGate className="w-56 mb-6" />

          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Sign in required
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Submit a park
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-7">
            Adding a park takes a free account so we can credit your submission
            and follow up if we have questions.
          </p>

          <div className="mt-8">
            <Button
              size="lg"
              onClick={() => promptSignIn({ description: DESCRIPTION })}
            >
              Sign in to continue
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
