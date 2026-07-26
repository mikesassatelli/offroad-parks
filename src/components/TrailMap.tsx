import { cn } from "@/lib/utils";

/**
 * Hand-authored cartoon "trail map" illustration for the welcome dialog — a
 * folded map sheet with a dashed route winding to a dropped pin.
 *
 * Drawn with `currentColor` and Tailwind text-color utilities so it adapts to
 * light and dark themes, matching {@link BrokenTruck} and {@link LockedGate}:
 * the route and pin read in the brand `text-primary` orange while the sheet,
 * fold creases and shadow pick up `text-foreground` / `text-muted-foreground`.
 */
export function TrailMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 190"
      role="img"
      aria-label="A folded trail map with a winding route leading to a dropped pin"
      className={cn("h-auto w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground / dust shadow */}
      <g className="text-muted-foreground">
        <ellipse cx="130" cy="170" rx="104" ry="8" fill="currentColor" opacity="0.14" />
      </g>

      {/* Map sheet */}
      <g>
        <rect
          className="text-muted-foreground"
          x="48"
          y="40"
          width="164"
          height="104"
          rx="8"
          fill="currentColor"
          opacity="0.16"
        />
        <rect
          className="text-foreground"
          x="48"
          y="40"
          width="164"
          height="104"
          rx="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.55"
        />
        {/* Fold creases */}
        <g
          className="text-muted-foreground"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 5"
          opacity="0.7"
        >
          <line x1="103" y1="44" x2="103" y2="140" />
          <line x1="157" y1="44" x2="157" y2="140" />
        </g>
      </g>

      {/* Winding route across the map (brand orange, dashed) */}
      <path
        className="text-primary"
        d="M70 124 C 86 100, 104 132, 120 108 S 150 78, 172 86"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="7 7"
      />
      {/* Start + mid waypoint dots */}
      <g className="text-primary" fill="currentColor">
        <circle cx="70" cy="124" r="5" />
        <circle cx="120" cy="108" r="4" opacity="0.8" />
      </g>

      {/* Dropped pin at the destination */}
      <g>
        <path
          className="text-primary"
          d="M182 60 c -10 0 -18 8 -18 18 c 0 12 18 30 18 30 c 0 0 18 -18 18 -30 c 0 -10 -8 -18 -18 -18 z"
          fill="currentColor"
        />
        <circle
          className="text-background"
          cx="182"
          cy="78"
          r="6"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
