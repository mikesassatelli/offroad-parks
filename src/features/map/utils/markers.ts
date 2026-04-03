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

// Apply default icon to all markers
L.Marker.prototype.options.icon = defaultIcon;

// Orange DivIcon for custom waypoints (home, fuel stops, etc.)
export function createCustomWaypointIcon(emoji = "📍") {
  return L.divIcon({
    className: "",
    html: `<div style="
      background: #f97316;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #c2410c;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      <span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${emoji}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}
