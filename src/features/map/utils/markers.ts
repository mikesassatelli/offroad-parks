/**
 * Leaflet marker helpers. Leaflet touches `window` at module load, so this
 * file must only be evaluated in the browser. All call sites reach this
 * file through `next/dynamic` with `ssr: false` (e.g. MapView).
 *
 * Components that only need color metadata (not Leaflet icon objects)
 * should import from `./pin-colors` instead, which stays SSR-safe.
 */
import L from "leaflet";

import { PIN_COLORS } from "./pin-colors";
export { PIN_COLORS } from "./pin-colors";

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
function createTeardropIcon(bg: string, border: string, content: string, fontSize = "11px", size = 26) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${bg};
      width:${size}px;
      height:${size}px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid ${border};
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 1px 3px rgba(0,0,0,0.35);
    ">
      <span style="transform:rotate(45deg);font-size:${fontSize};line-height:1;color:#fff;font-weight:700;">${content}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
}

// Park pin — teardrop with index number, default blue
export function createParkPinIcon(index: number, color = "blue") {
  const { bg, border } = PIN_COLORS[color] ?? PIN_COLORS.blue;
  return createTeardropIcon(bg, border, String(index + 1), "11px", 26);
}

// Custom waypoint pin — teardrop with emoji, default orange
export function createCustomWaypointIcon(emoji = "📍", color = "orange") {
  const { bg, border } = PIN_COLORS[color] ?? PIN_COLORS.orange;
  return createTeardropIcon(bg, border, emoji, "13px", 26);
}

// Unselected park pin — small solid circle, forest green
export const defaultParkIcon = (() => {
  const size = 14;
  return L.divIcon({
    className: "",
    html: `<div style="
      background:#16a34a;
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      border:2px solid #14532d;
      box-shadow:0 1px 2px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size + 4)],
  });
})();

// Apply default icon to all markers (fallback)
L.Marker.prototype.options.icon = defaultIcon;
