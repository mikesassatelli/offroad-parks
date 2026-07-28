"use client";

import Link from "next/link";
import { Camera, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuggestCorrectionDialog } from "./SuggestCorrectionDialog";

interface ContributeCardProps {
  /** Slug of the park (park.id) — passed through to the correction dialog. */
  parkSlug: string;
  /** Park name, shown in the correction dialog copy. */
  parkName: string;
  /**
   * Switches the detail page to the Photos tab, where the uploader / sign-in
   * prompt lives. Keeps photo contribution in one place instead of rebuilding
   * the uploader here.
   */
  onAddPhotos: () => void;
}

/**
 * A single, understated "accuracy" card for the park-detail sidebar. Gathers
 * the crowd-sourced contribution affordances that were previously scattered
 * down the page — suggest a correction, add photos, and claim the listing —
 * into one calm, always-available spot (Wikipedia-style: edit is invited, never
 * shouty). The claim affordance is a short pointer to the full `ParkClaimCTA`
 * (mounted lower in the sidebar under `#claim`), so the claim form is not
 * duplicated.
 */
export function ContributeCard({
  parkSlug,
  parkName,
  onAddPhotos,
}: ContributeCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          Help keep this listing accurate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This is a community directory. Spot something off, or been here
          yourself? Lend a hand.
        </p>
        <div className="flex flex-col gap-2">
          <SuggestCorrectionDialog parkSlug={parkSlug} parkName={parkName} />
          <Button
            variant="outline"
            size="sm"
            onClick={onAddPhotos}
            className="justify-center"
          >
            <Camera className="w-4 h-4 mr-1.5" />
            Add photos
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Own or manage this park?{" "}
          <Link
            href="#claim"
            className="text-primary underline underline-offset-2 font-medium hover:opacity-80"
          >
            Claim it
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
