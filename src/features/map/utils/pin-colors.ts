/**
 * Shared pin color palette — extracted from markers.ts so that components
 * which only need the color data (e.g. RouteListItem color picker) can
 * import it without pulling in Leaflet. Leaflet touches `window` at module
 * load, which breaks SSR.
 */
export const PIN_COLORS: Record<
  string,
  { bg: string; border: string; label: string }
> = {
  blue: { bg: "#3b82f6", border: "#1d4ed8", label: "Blue" },
  green: { bg: "#22c55e", border: "#15803d", label: "Green" },
  red: { bg: "#ef4444", border: "#b91c1c", label: "Red" },
  orange: { bg: "#f97316", border: "#c2410c", label: "Orange" },
  purple: { bg: "#a855f7", border: "#7e22ce", label: "Purple" },
  pink: { bg: "#ec4899", border: "#be185d", label: "Pink" },
  teal: { bg: "#14b8a6", border: "#0f766e", label: "Teal" },
  yellow: { bg: "#eab308", border: "#a16207", label: "Yellow" },
};
