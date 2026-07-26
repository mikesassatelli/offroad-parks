"use client";

import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GoogleLogo } from "@/components/auth/GoogleLogo";
import { TrailSign } from "@/components/TrailSign";

const DEFAULT_DESCRIPTION =
  "Sign in to save favorites, plan routes, and leave reviews. It's free and takes a second.";

export interface SignInRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contextual reason shown in the body, e.g. "Sign in to save favorites." */
  description?: string;
  /** Where to return after a successful sign-in. Defaults to the current page. */
  callbackUrl?: string;
}

/**
 * Themed "you need to sign in" popup — the rugged, on-brand replacement for the
 * native `alert("Please sign in…")` we used to gate favorites and other
 * signed-in-only actions. Mirrors the 404 page's look (the {@link TrailSign}
 * illustration, an uppercase eyebrow, an extrabold heading and muted body copy)
 * so a blocked action feels like part of the trail, not a browser interruption.
 */
export function SignInRequiredDialog({
  open,
  onOpenChange,
  description = DEFAULT_DESCRIPTION,
  callbackUrl,
}: SignInRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center text-center">
          <TrailSign className="w-44 mb-5" />

          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Sign in required
          </p>
          <DialogTitle className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
            One quick step first
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm text-muted-foreground leading-6">
            {description}
          </DialogDescription>

          <div className="mt-6 flex w-full flex-col gap-2">
            <Button
              className="w-full h-11 gap-3 border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-700 dark:border-gray-300 dark:bg-white dark:text-gray-700 dark:hover:bg-gray-50 dark:hover:text-gray-700"
              onClick={() =>
                signIn("google", callbackUrl ? { callbackUrl } : undefined)
              }
            >
              <GoogleLogo />
              Sign in with Google
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" className="w-full">
                Maybe later
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
