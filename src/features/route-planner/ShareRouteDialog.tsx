"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SavedRoute } from "@/lib/types";

interface ShareRouteDialogProps {
  /**
   * The route being shared. When `null`, the dialog is closed. Parent controls
   * visibility by setting / clearing this value.
   */
  route: SavedRoute | null;
  onOpenChange: (open: boolean) => void;
  /**
   * Called when the "Allow sharing" toggle changes. Parent is responsible for
   * PATCHing the route and returning the updated record so the dialog can
   * update its local view. Returning `null` is treated as a failure.
   */
  onToggleShare: (route: SavedRoute, next: boolean) => Promise<SavedRoute | null>;
}

export function ShareRouteDialog({
  route,
  onOpenChange,
  onToggleShare,
}: ShareRouteDialogProps) {
  const [isPublic, setIsPublic] = useState<boolean>(route?.isPublic ?? false);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string>(route?.shareToken ?? "");

  // Reset local state when a new route is passed in.
  useEffect(() => {
    setIsPublic(route?.isPublic ?? false);
    setShareToken(route?.shareToken ?? "");
    setCopied(false);
    setError(null);
  }, [route?.id, route?.isPublic, route?.shareToken]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareToken ? `${origin}/routes/share/${shareToken}` : "";

  const handleToggle = async (next: boolean) => {
    if (!route) return;
    setIsToggling(true);
    setError(null);
    try {
      const updated = await onToggleShare(route, next);
      if (!updated) {
        setError("Failed to update sharing");
        return;
      }
      setIsPublic(updated.isPublic);
      setShareToken(updated.shareToken);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy link — try selecting it manually");
    }
  };

  return (
    <Dialog
      open={route !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share route</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this route. You can revoke access any
            time by turning sharing off.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Allow sharing</p>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? "The link below is active."
                  : "Sharing is off — turn it on to generate a public link."}
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="sr-only">Allow sharing</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Allow sharing"
                checked={isPublic}
                disabled={isToggling}
                onChange={(e) => handleToggle(e.target.checked)}
                className="h-4 w-4"
              />
              {isToggling && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
            </label>
          </div>

          {/* URL + copy */}
          <div className="space-y-2">
            <label
              htmlFor="share-url"
              className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
            >
              Share link
            </label>
            <div className="flex gap-2">
              <input
                id="share-url"
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Share URL"
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                disabled={!isPublic}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!isPublic || !shareUrl}
                aria-label="Copy link"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy link
                  </>
                )}
              </Button>
            </div>
            {!isPublic && (
              <p className="text-xs text-muted-foreground">
                Sharing is off — the link will return a 404 until you turn it
                back on.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
