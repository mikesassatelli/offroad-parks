"use client";

import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrailMap } from "@/components/TrailMap";
import { MapPinned, SlidersHorizontal, Star } from "lucide-react";

export interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURES = [
  {
    Icon: SlidersHorizontal,
    title: "Filter to your kind of park",
    body: "Narrow by state, terrain, and amenities to find parks that fit your rig.",
  },
  {
    Icon: MapPinned,
    title: "Dig into trails and access",
    body: "Open any park's Location tab for the trail-network map and where to get on.",
  },
  {
    Icon: Star,
    title: "Save favorites and plan routes",
    body: "With a free account, keep the parks you love and build trips around them.",
  },
];

/**
 * First-run orientation popup for new visitors. Mirrors the 404 / sign-in
 * dialogs' look (the {@link TrailMap} illustration, an uppercase eyebrow, an
 * extrabold heading) and lays out the three things a newcomer can do right
 * away. Purely informational — the primary action just closes it and lets them
 * explore. Open/first-visit state is owned by WelcomeProvider.
 */
export function WelcomeDialog({ open, onOpenChange }: WelcomeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center">
          <TrailMap className="w-44 mb-4" />

          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            New here?
          </p>
          <DialogTitle className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
            Welcome to Offroad Parks
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground leading-6">
            A quick tour of what you can do here.
          </DialogDescription>
        </div>

        <ul className="mt-5 flex flex-col gap-4 text-left">
          {FEATURES.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground leading-6">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <DialogClose asChild>
            <Button size="lg" className="w-full">
              Start exploring
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
