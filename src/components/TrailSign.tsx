import { cn } from "@/lib/utils";

/**
 * Hand-authored cartoon "trail signpost" illustration for the sign-in prompt —
 * a friendly wayfinding post with directional boards. Replaces the padlocked
 * gate, which read as an error ("something's locked/wrong") rather than a warm
 * "sign in to keep exploring."
 *
 * Drawn with `currentColor` and Tailwind text-color utilities so it adapts to
 * light and dark themes (same family as {@link BrokenTruck} / {@link TrailMap}):
 * the boards read in the brand `text-primary` orange while the post, bolts and
 * shadow pick up `text-foreground` / `text-muted-foreground`. No hard-coded hex.
 */
export function TrailSign({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 190"
      role="img"
      aria-label="A trail signpost with directional boards"
      className={cn("h-auto w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground / dust shadow */}
      <g className="text-muted-foreground">
        <ellipse cx="130" cy="172" rx="86" ry="8" fill="currentColor" opacity="0.14" />
      </g>

      {/* Signpost */}
      <g className="text-foreground" fill="currentColor">
        <rect x="123" y="40" width="13" height="128" rx="4" />
        {/* Rounded finial cap */}
        <circle cx="129.5" cy="42" r="8" />
      </g>

      {/* Directional boards (brand orange), alternating left / right */}
      <g className="text-primary" fill="currentColor">
        {/* points right */}
        <polygon points="92,58 168,58 186,70 168,82 92,82" />
        {/* points left */}
        <polygon points="167,92 91,92 73,104 91,116 167,116" />
        {/* points right */}
        <polygon points="100,126 158,126 176,138 158,150 100,150" />
      </g>

      {/* Mounting bolts on each board (over the post) */}
      <g className="text-background" fill="currentColor">
        <circle cx="129.5" cy="70" r="2.6" />
        <circle cx="129.5" cy="104" r="2.6" />
        <circle cx="129.5" cy="138" r="2.6" />
      </g>
    </svg>
  );
}
