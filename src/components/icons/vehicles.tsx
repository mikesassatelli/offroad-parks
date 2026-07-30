import { cn } from "@/lib/utils";

/**
 * Hand-drawn off-road vehicle glyphs in Lucide's style: a 24px grid, 2px
 * round `currentColor` strokes and no fill, so they line up with the Lucide
 * icons used elsewhere and inherit size + color from `className` (e.g.
 * `h-3.5 w-3.5 text-muted-foreground`).
 *
 * Lucide ships no motorcycle, ATV/quad or side-by-side icons, so these cover
 * the off-road vehicle types the park detail chips need. Drawn in side
 * profile to sit consistently beside one another.
 */

const SVG_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  xmlns: "http://www.w3.org/2000/svg",
} as const;

/** Quad / ATV — fat tires, seat hump and a front handlebar. */
export function AtvIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-6 w-6", className)} {...SVG_PROPS} aria-hidden="true">
      <circle cx="6" cy="16.5" r="3" />
      <circle cx="18" cy="16.5" r="3" />
      <path d="M2.5 14c.4-2 1.8-2.5 3.5-2.5h2.2L10 8.5h3l1.5 3" />
      <path d="M14 11.5 16 8h2" />
      <path d="M16 8c2.2 0 5 1.2 5.5 5" />
    </svg>
  );
}

/** Side-by-side / UTV — open cockpit under a swept roll cage. */
export function SxsIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-6 w-6", className)} {...SVG_PROPS} aria-hidden="true">
      <circle cx="6" cy="16" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
      <path d="M2.5 14.5V12h9.5l2-1.5 6.5 2.5v1.5" />
      <path d="M14 10.5 12.5 6.5H7.5L6 12" />
    </svg>
  );
}

/** Full-size 4x4 — a pickup with cab and open bed. */
export function FullSizeTruckIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-6 w-6", className)} {...SVG_PROPS} aria-hidden="true">
      <circle cx="6.5" cy="15" r="2.5" />
      <circle cx="17.5" cy="15" r="2.5" />
      <path d="M2.5 15v-3h3.5l2.5-4H12v3h9.5v4" />
      <path d="M2.5 15H4" />
      <path d="M9 15h6" />
      <path d="M20 15h1.5" />
    </svg>
  );
}
