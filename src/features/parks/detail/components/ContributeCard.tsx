"use client";

import { Camera, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuggestCorrectionDialog } from "./SuggestCorrectionDialog";
import { ParkClaimCTA } from "./ParkClaimCTA";

interface ContributeCardProps {
  /** Slug of the park (park.id) — passed through to the correction dialog + claim flow. */
  parkSlug: string;
  /** Park name, shown in the correction dialog copy. */
  parkName: string;
  /**
   * Switches the detail page to the Photos tab, where the uploader / sign-in
   * prompt lives. Keeps photo contribution in one place instead of rebuilding
   * the uploader here.
   */
  onAddPhotos: () => void;
  /** Claim-flow props, threaded straight through to the embedded ParkClaimCTA. */
  isLoggedIn: boolean;
  hasOperator?: boolean;
  existingClaim?: { status: string; reviewNotes: string | null } | null;
  isOperatorOfPark?: boolean;
  operatorName?: string | null;
}

/**
 * A single, understated card for the park-detail sidebar gathering every
 * crowd-sourced contribution affordance — suggest a correction, add photos, and
 * claim the listing — into one calm, always-available spot (Wikipedia-style:
 * edit is invited, never shouty). The claim flow is embedded directly here as a
 * second section rather than living in a separate box the card merely links to.
 */
export function ContributeCard({
  parkSlug,
  parkName,
  onAddPhotos,
  isLoggedIn,
  hasOperator,
  existingClaim,
  isOperatorOfPark,
  operatorName,
}: ContributeCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          Help keep this listing accurate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
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
        </div>
        <div className="border-t border-border pt-4">
          <ParkClaimCTA
            embedded
            parkSlug={parkSlug}
            isLoggedIn={isLoggedIn}
            hasOperator={hasOperator}
            existingClaim={existingClaim}
            isOperatorOfPark={isOperatorOfPark}
            operatorName={operatorName}
          />
        </div>
      </CardContent>
    </Card>
  );
}
