import { Polyline, Tooltip } from "react-leaflet";

/**
 * POC: renders an OHV trail *network* on the Leaflet map from a GeoJSON
 * FeatureCollection of trail LineStrings, styled by the trail's managed-use
 * attributes (the same distinction the paper MVUM draws with dotted vs. dashed
 * symbology). Data provenance lives in the FeatureCollection's `metadata`.
 *
 * This is intentionally source-agnostic: any pipeline that produces
 * `{ properties: { name, atv, motorcycle, seasonal, ... }, geometry }` features
 * (USFS NFS Trails, a state mirror, an operator GPX import) renders here. See
 * docs/poc/trail-overlay.md for the productionization path (ParkTrailGeometry /
 * ParkMapMarker models).
 */

type LngLat = [number, number];

interface TrailFeature {
  type: "Feature";
  properties: {
    name?: string | null;
    id?: string | null;
    atv?: string | null;
    motorcycle?: string | null;
    fourwd_gt50?: string | null;
    other_wheeled_ohv?: string | null;
    seasonal?: string | null;
    trail_class?: string | null;
  };
  geometry:
    | { type: "LineString"; coordinates: LngLat[] }
    | { type: "MultiLineString"; coordinates: LngLat[][] }
    | null;
}

export interface TrailFeatureCollection {
  type: "FeatureCollection";
  metadata?: Record<string, unknown>;
  features: TrailFeature[];
}

interface TrailOverlayProps {
  data: TrailFeatureCollection;
}

/** Vehicle-class → line style. Mirrors MVUM symbology intent. */
type UseClass = "atv" | "motorcycle" | "fourwd" | "other";

const STYLE: Record<
  UseClass,
  { color: string; weight: number; dashArray?: string; label: string }
> = {
  // ATV / UTV open — the "wide" motorized class. Solid amber.
  atv: { color: "#d97706", weight: 4, label: "ATV / UTV" },
  // Motorcycle-only (single-track). Dashed violet — the classic dotted MVUM look.
  motorcycle: {
    color: "#7c3aed",
    weight: 3,
    dashArray: "6 6",
    label: "Motorcycle only",
  },
  // 4WD > 50\" open. Solid slate.
  fourwd: { color: "#0f766e", weight: 4, label: "4WD > 50\"" },
  other: { color: "#6b7280", weight: 2.5, dashArray: "2 6", label: "Other" },
};

const isOpen = (v?: string | null) => (v ?? "").toLowerCase() === "open";

function classify(p: TrailFeature["properties"]): UseClass {
  if (isOpen(p.atv) || isOpen(p.other_wheeled_ohv)) return "atv";
  if (isOpen(p.motorcycle)) return "motorcycle";
  if (isOpen(p.fourwd_gt50)) return "fourwd";
  return "other";
}

/** GeoJSON is [lng, lat]; Leaflet wants [lat, lng]. */
const toLatLngs = (coords: LngLat[]): LngLat[] =>
  coords.map(([lng, lat]) => [lat, lng]);

function lineParts(geometry: TrailFeature["geometry"]): LngLat[][] {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [toLatLngs(geometry.coordinates)];
  return geometry.coordinates.map(toLatLngs);
}

export function TrailOverlay({ data }: TrailOverlayProps) {
  return (
    <>
      {data.features.map((feature, i) => {
        const parts = lineParts(feature.geometry);
        if (parts.length === 0) return null;

        const useClass = classify(feature.properties);
        const s = STYLE[useClass];
        const { name, seasonal } = feature.properties;

        return parts.map((positions, j) => (
          <Polyline
            key={`trail-${feature.properties.id ?? i}-${j}`}
            positions={positions}
            color={s.color}
            weight={s.weight}
            opacity={0.9}
            dashArray={s.dashArray}
          >
            <Tooltip sticky direction="top" className="text-xs">
              <span className="font-semibold">{name ?? "Unnamed trail"}</span>
              <br />
              {s.label}
              {seasonal ? ` · ${seasonal}` : ""}
            </Tooltip>
          </Polyline>
        ));
      })}
    </>
  );
}
