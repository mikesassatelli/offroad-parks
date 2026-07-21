import { cn } from "@/lib/utils";

/**
 * Hand-authored cartoon "broken-down offroad truck" illustration.
 *
 * The whole scene is drawn with `currentColor` and Tailwind text-color
 * utilities so it adapts to light and dark themes: the body reads in the
 * brand `text-primary` orange, while tires, roll cage, dust and popped bolts
 * pick up `text-foreground` / `text-muted-foreground`. No hard-coded hex, so
 * it stays legible on either background.
 */
export function BrokenTruck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 190"
      role="img"
      aria-label="A broken-down offroad truck tilted on a bare hub with a flat tire lying beside it and a puff of smoke rising from the hood"
      className={cn("h-auto w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground / dust shadow */}
      <g className="text-muted-foreground">
        <ellipse cx="132" cy="172" rx="116" ry="9" fill="currentColor" opacity="0.14" />
      </g>

      {/* Puffs of smoke drifting up from the hood */}
      <g className="text-muted-foreground" fill="currentColor">
        <circle cx="66" cy="70" r="9" opacity="0.30" />
        <circle cx="55" cy="55" r="7" opacity="0.24" />
        <circle cx="70" cy="48" r="6" opacity="0.18" />
        <circle cx="58" cy="40" r="4.5" opacity="0.12" />
      </g>

      {/* The truck, tilted forward onto its bare front hub */}
      <g transform="rotate(5 130 118)">
        {/* Body + nose (brand orange) */}
        <g className="text-primary" fill="currentColor">
          <path
            d="M78 132
               L74 112
               Q74 106 80 105
               L96 104
               L112 82
               Q115 78 121 78
               L166 78
               Q172 78 174 84
               L186 108
               L202 114
               Q210 116 210 124
               L210 132
               Q210 138 204 138
               L84 138
               Q78 138 78 132 Z"
          />
          {/* Front skid / bumper lip */}
          <path
            d="M72 130 L74 118 Q74 122 80 123 L94 123 L92 132 Z"
            opacity="0.85"
          />
        </g>

        {/* Cockpit window glass */}
        <path
          className="text-foreground"
          d="M118 84 L162 84 Q166 84 167 90 L173 104 L118 104 Z"
          fill="currentColor"
          opacity="0.16"
        />

        {/* Roll cage + seat detail */}
        <g
          className="text-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M114 106 L120 80 L166 80 L176 106" />
          <path d="M140 80 L146 106" opacity="0.6" />
          <path d="M132 106 L134 118" opacity="0.5" />
        </g>

        {/* Rear wheel — intact knobby tire */}
        <g>
          <circle className="text-foreground" cx="178" cy="140" r="23" fill="currentColor" />
          <circle
            className="text-muted-foreground"
            cx="178"
            cy="140"
            r="23"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="4 5"
          />
          <circle className="text-primary" cx="178" cy="140" r="9" fill="currentColor" />
          <circle className="text-foreground" cx="178" cy="140" r="3" fill="currentColor" />
        </g>

        {/* Bare front hub — the wheel that fell off */}
        <g className="text-muted-foreground">
          <circle cx="98" cy="141" r="10" fill="currentColor" />
          <circle
            className="text-foreground"
            cx="98"
            cy="141"
            r="4"
            fill="currentColor"
          />
        </g>

        {/* Headlight */}
        <circle className="text-foreground" cx="79" cy="116" r="4" fill="currentColor" opacity="0.85" />
      </g>

      {/* Detached, flat tire lying in the foreground */}
      <g>
        <ellipse
          className="text-foreground"
          cx="60"
          cy="156"
          rx="30"
          ry="14"
          fill="currentColor"
        />
        <ellipse
          className="text-muted-foreground"
          cx="60"
          cy="156"
          rx="30"
          ry="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="4 5"
        />
        <ellipse
          className="text-primary"
          cx="60"
          cy="156"
          rx="12"
          ry="5.5"
          fill="currentColor"
        />
      </g>

      {/* Popped-out bolts scattered by the hub */}
      <g className="text-muted-foreground" fill="currentColor">
        <circle cx="120" cy="164" r="3" />
        <circle cx="134" cy="169" r="2.5" opacity="0.8" />
        <circle cx="108" cy="171" r="2" opacity="0.7" />
      </g>
    </svg>
  );
}
