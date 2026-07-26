import { cn } from "@/lib/utils";

/**
 * Hand-authored cartoon "locked trailhead gate" illustration — the sign-in
 * counterpart to {@link BrokenTruck} on the 404 page.
 *
 * Like BrokenTruck, the whole scene is drawn with `currentColor` and Tailwind
 * text-color utilities so it adapts to light and dark themes: the gate reads in
 * the brand `text-primary` orange, while the posts, padlock and ground pick up
 * `text-foreground` / `text-muted-foreground`. No hard-coded hex, so it stays
 * legible on either background.
 */
export function LockedGate({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 190"
      role="img"
      aria-label="A closed trailhead gate with a padlock hanging from the top rail"
      className={cn("h-auto w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground / dust shadow */}
      <g className="text-muted-foreground">
        <ellipse cx="130" cy="174" rx="116" ry="9" fill="currentColor" opacity="0.14" />
      </g>

      {/* Gate posts, sunk into the ground either side */}
      <g className="text-foreground" fill="currentColor">
        <rect x="42" y="56" width="18" height="112" rx="5" />
        <rect x="200" y="56" width="18" height="112" rx="5" />
      </g>

      {/* The closed gate itself (brand orange) */}
      <g className="text-primary">
        {/* Diagonal brace, drawn first so the rails tuck over its ends */}
        <line
          x1="74"
          y1="150"
          x2="186"
          y2="96"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.85"
        />
        <g fill="currentColor">
          {/* Top + bottom rails */}
          <rect x="66" y="90" width="128" height="13" rx="3" />
          <rect x="66" y="138" width="128" height="13" rx="3" />
          {/* Left + right stiles framing the rails */}
          <rect x="66" y="90" width="13" height="61" rx="3" />
          <rect x="181" y="90" width="13" height="61" rx="3" />
        </g>
      </g>

      {/* Padlock hanging over the top rail, locking the gate shut */}
      <g>
        {/* Shackle, straddling the top rail */}
        <path
          className="text-foreground"
          d="M120 112 L120 96 A10 10 0 0 1 140 96 L140 112"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Lock body */}
        <rect
          className="text-foreground"
          x="111"
          y="110"
          width="38"
          height="34"
          rx="7"
          fill="currentColor"
        />
        {/* Keyhole */}
        <g className="text-primary" fill="currentColor">
          <circle cx="130" cy="123" r="4.5" />
          <path d="M127.5 125 L132.5 125 L131 137 L129 137 Z" />
        </g>
      </g>
    </svg>
  );
}
