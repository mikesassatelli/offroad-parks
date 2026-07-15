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

/**
 * Sign-in dialog offering both Google OAuth and passwordless email
 * magic-link (OP-97). The email path calls the Auth.js "resend" provider,
 * which sends the link through our shared sender (dev fallback logs it).
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
        <Button variant="outline" size="sm" className="gap-2">
          <LogIn className="w-4 h-4" />
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to Offroad Parks</DialogTitle>
          <DialogDescription>
            Continue with Google, or get a one-time sign-in link by email.
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
              className="w-full"
              onClick={() => signIn("google", { callbackUrl: CALLBACK_URL })}
            >
              Continue with Google
            </Button>

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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
