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
import { LogIn, Mail } from "lucide-react";

const CALLBACK_URL = "/";

// Passwordless email magic-link sign-in (OP-97) is temporarily hidden while
// we go Google-only. The UI, state, and handler below are kept intact behind
// this flag so email sign-in can be restored by flipping it back to `true`.
const EMAIL_LOGIN_ENABLED = false;

/**
 * Google "G" logo mark, inline SVG (no network request) so the button looks
 * like a standard Google sign-in button in both light and dark mode.
 */
function GoogleLogo() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.4 0 10.3-1.8 14-5.1l-6.5-5.4C29.5 36.6 26.9 37.5 24 37.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 40.6 16.2 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.4C40.9 36.1 45 30.5 45 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

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
