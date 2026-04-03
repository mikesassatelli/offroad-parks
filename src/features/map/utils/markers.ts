import L from "leaflet";

// Fix for default marker icons in react-leaflet
export const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Shared teardrop DivIcon builder — used for both park pins and custom waypoints
function createTeardropIcon(bg: string, border: string, content: string, fontSize = "12px") {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${bg};
      width:32px;
      height:32px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid ${border};
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 2px 4px rgba(0,0,0,0.3);
    ">
      <span style="transform:rotate(45deg);font-size:${fontSize};line-height:1;color:#fff;font-weight:600;">${content}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

// Available pin colors (hex bg, border)
export const PIN_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  blue:   { bg: "#3b82f6", border: "#1d4ed8", label: "Blue" },
  green:  { bg: "#22c55e", border: "#15803d", label: "Green" },
  red:    { bg: "#ef4444", border: "#b91c1c", label: "Red" },
  orange: { bg: "#f97316", border: "#c2410c", label: "Orange" },
  purple: { bg: "#a855f7", border: "#7e22ce", label: "Purple" },
  pink:   { bg: "#ec4899", border: "#be185d", label: "Pink" },
  teal:   { bg: "#14b8a6", border: "#0f766e", label: "Teal" },
  yellow: { bg: "#eab308", border: "#a16207", label: "Yellow" },
};

// Park pin — teardrop with index number, default blue
export function createParkPinIcon(index: number, color = "blue") {
  const { bg, border } = PIN_COLORS[color] ?? PIN_COLORS.blue;
  return createTeardropIcon(bg, border, String(index + 1));
}

// Custom waypoint pin — teardrop with emoji, default orange
export function createCustomWaypointIcon(emoji = "📍", color = "orange") {
  const { bg, border } = PIN_COLORS[color] ?? PIN_COLORS.orange;
  return createTeardropIcon(bg, border, emoji, "14px");
}

// Gray teardrop for parks not yet in route
export const defaultParkIcon = createTeardropIcon("#6b7280", "#374151", "▲", "10px");

// Apply default icon to all markers (fallback)
L.Marker.prototype.options.icon = defaultIcon;
