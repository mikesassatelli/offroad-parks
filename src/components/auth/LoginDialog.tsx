"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleLogo } from "@/components/auth/GoogleLogo";
import { LogIn, Mail } from "lucide-react";

const CALLBACK_URL = "/";

// Passwordless email magic-link sign-in (OP-97) is temporarily hidden while
// we go Google-only. The UI, state, and handler below are kept intact behind
// this flag so email sign-in can be restored by flipping it back to `true`.
const EMAIL_LOGIN_ENABLED = false;

/**
 * Sign-in dialog offering Google OAuth (and, when EMAIL_LOGIN_ENABLED is
 * flipped back on, passwordless email magic-link sign-in via OP-97's
 * Auth.js "resend" provider, which sends the link through our shared sender
 * with a dev fallback that logs it).
 */
export function LoginDialog() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn("resend", {
        email,
        redirect: false,
        callbackUrl: CALLBACK_URL,
      });
      if (result?.error) {
        setError("Something went wrong sending your link. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong sending your link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="Sign In">
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to Offroad Parks</DialogTitle>
          <DialogDescription>
            Sign in to save favorites, plan routes, and leave reviews.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-2 text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Check your email</p>
            <p>
              We sent a sign-in link to <strong>{email}</strong>. It expires in
              24 hours.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-11 gap-3 border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-700 dark:border-gray-300 dark:bg-white dark:text-gray-700 dark:hover:bg-gray-50 dark:hover:text-gray-700"
              onClick={() => signIn("google", { callbackUrl: CALLBACK_URL })}
            >
              <GoogleLogo />
              Sign in with Google
            </Button>

            {EMAIL_LOGIN_ENABLED && (
              <>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={handleEmailSignIn} className="space-y-2">
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label="Email address"
                  />
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={submitting}
                  >
                    <Mail className="w-4 h-4" />
                    {submitting ? "Sending…" : "Email me a sign-in link"}
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </form>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
