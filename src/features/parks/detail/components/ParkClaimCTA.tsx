"use client";

import { useState } from "react";
import { Building2, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ParkClaimCTAProps {
  parkSlug: string;
  isLoggedIn: boolean;
  /** If the park already has an operator, hide the CTA entirely */
  hasOperator?: boolean;
  /** Existing claim for this user+park, if any */
  existingClaim?: { status: string; reviewNotes: string | null } | null;
  /** Whether the current user is an operator of this park */
  isOperatorOfPark?: boolean;
  /** Display name of the operator org, if the park is claimed */
  operatorName?: string | null;
}

interface ClaimFormData {
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  businessName: string;
  message: string;
}

export function ParkClaimCTA({ parkSlug, isLoggedIn, hasOperator, existingClaim, isOperatorOfPark, operatorName }: ParkClaimCTAProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(
    !!existingClaim && existingClaim.status !== "REJECTED"
  );
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ClaimFormData>({
    claimantName: "",
    claimantEmail: "",
    claimantPhone: "",
    businessName: "",
    message: "",
  });

  if (isOperatorOfPark) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">You manage this park</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                You&apos;re registered as an operator of this park.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasOperator) {
    return (
      <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900/40 dark:border-gray-700">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs">
              This park is managed by{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {operatorName ?? "a verified operator"}
              </span>
              . Information on this page may be more accurate and up to date.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rejected state — shown server-side and cannot re-submit
  if (existingClaim?.status === "REJECTED") {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Claim not approved</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                Your claim request for this park was not approved.
              </p>
              {existingClaim.reviewNotes && (
                <p className="text-xs text-red-700 dark:text-red-400 mt-1.5 border-t border-red-200 dark:border-red-800 pt-1.5">
                  <span className="font-medium">Note: </span>
                  {existingClaim.reviewNotes}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/parks/${parkSlug}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimantName: form.claimantName,
          claimantEmail: form.claimantEmail,
          claimantPhone: form.claimantPhone || undefined,
          businessName: form.businessName || undefined,
          message: form.message || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit claim");
        return;
      }

      setIsSuccess(true);
      setIsExpanded(false);
    } catch {
      setError("Failed to submit claim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Claim submitted!</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                We&apos;ll review your request and get back to you by email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Own or manage this park?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Claim your listing to manage your park&apos;s profile, post trail conditions, and respond to visitors.
        </p>

        {!isLoggedIn ? (
          <p className="text-xs text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/auth/signin"
              className="text-primary underline underline-offset-2 font-medium hover:opacity-80"
            >
              Sign in
            </a>{" "}
            to claim this park.
          </p>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsExpanded((v) => !v)}
            >
              Claim this park
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>

            {isExpanded && (
              <form onSubmit={handleSubmit} className="space-y-3 pt-1" data-testid="claim-form">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Organization or business name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.businessName}
                    onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                    placeholder="Iowa DNR, Desert Riders Association…"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Your name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.claimantName}
                    onChange={(e) => setForm((f) => ({ ...f, claimantName: e.target.value }))}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Contact email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.claimantEmail}
                    onChange={(e) => setForm((f) => ({ ...f, claimantEmail: e.target.value }))}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={form.claimantPhone}
                    onChange={(e) => setForm((f) => ({ ...f, claimantPhone: e.target.value }))}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Why are you claiming this park? (optional)
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                    rows={3}
                    placeholder="I am the owner/manager of this park..."
                  />
                </div>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting…" : "Submit claim"}
                </Button>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
