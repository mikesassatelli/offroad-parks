"use client";

/**
 * PROOF OF CONCEPT — OHV trail-network overlay.
 *
 * Renders the real Brock Creek Multi-Use Trail System (Ozark–St. Francis NF)
 * on the app's existing Leaflet map, styled by managed-use class. The trail
 * geometry is REAL, pulled from the Arkansas GIS Office (GeoStor) mirror of the
 * USFS National Forest System Trails dataset — see the provenance footer and
 * public/poc/brock-creek-trails.geojson `metadata`.
 *
 * This page is self-contained and has NO database dependency so it renders
 * regardless of local seed state. Productionization path (Prisma
 * ParkTrailGeometry / ParkMapMarker models, ingestion cron) is written up in
 * docs/poc/trail-overlay.md.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { TrailFeatureCollection } from "@/features/map/components/TrailOverlay";
import type { ParkMapMarker } from "@/lib/types";

const MapView = dynamic(
  () => import("@/features/map/MapView").then((mod) => mod.MapView),
  { ssr: false },
);

// Center + zoom framing the Brock Creek network (bbox center of the fetched data).
const BROCK_CREEK_CENTER: [number, number] = [35.5143, -92.8117];
const BROCK_CREEK_ZOOM = 13;

// The same 4 access points seeded into the DB by the ParkMapMarker migration.
// Shown here so the POC previews exactly what the park detail Location tab will
// render. Coordinates: OpenStreetMap (ODbL).
const ACCESS_POINTS: ParkMapMarker[] = [
  { id: "poc-austin", type: "TRAILHEAD", name: "Austin Trailhead", lat: 35.53621, lng: -92.80373 },
  { id: "poc-mtnman", type: "TRAILHEAD", name: "Mountain Man Trailhead", lat: 35.52996, lng: -92.83928 },
  { id: "poc-zing", type: "TRAILHEAD", name: "Zing Trailhead", lat: 35.51044, lng: -92.81777 },
  { id: "poc-rec", type: "RECREATION_AREA", name: "Brock Creek Lake Recreation Area", lat: 35.48960, lng: -92.80935 },
];

const LEGEND: { swatch: string; dashed?: boolean; label: string }[] = [
  { swatch: "#d97706", label: "ATV / UTV open" },
  { swatch: "#7c3aed", dashed: true, label: "Motorcycle only (single-track)" },
  { swatch: "#0f766e", label: '4WD > 50" open' },
];

export default function BrockCreekPocPage() {
  const [data, setData] = useState<TrailFeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/poc/brock-creek-trails.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: TrailFeatureCollection) => setData(json))
      .catch((e) => setError(e.message));
  }, []);

  const count = data?.features.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Proof of concept · trail overlay
        </p>
        <h1 className="text-2xl font-bold">Brock Creek Multi-Use Trail System</h1>
        <p className="text-sm text-muted-foreground">
          Ozark–St. Francis National Forest · Big Piney Ranger District ·{" "}
          {count > 0 ? `${count} trail segments` : "loading…"}
        </p>
      </header>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-0 w-7 rounded"
              style={{
                borderTopWidth: 3,
                borderTopStyle: l.dashed ? "dashed" : "solid",
                borderTopColor: l.swatch,
              }}
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* Map */}
      <div className="relative">
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            Failed to load trail data: {error}
          </div>
        )}
        {!error && (
          <MapView
            parks={[]}
            trailOverlay={data}
            mapMarkers={ACCESS_POINTS}
            initialCenter={BROCK_CREEK_CENTER}
            initialZoom={BROCK_CREEK_ZOOM}
            containerClassName="h-[70vh] w-full overflow-hidden rounded-lg border shadow-sm"
          />
        )}
      </div>

      {/* Provenance — the accuracy/attribution requirement */}
      <footer className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p>
          <strong>Trail geometry:</strong> real. Source: Arkansas GIS Office
          (GeoStor) <code>OZARKNFS_TRAILS_NFS</code>, a state mirror of the USFS
          National Forest System Trails dataset (public domain / CC0). Styling
          keyed on each segment&rsquo;s managed-use attributes.
        </p>
        <p>
          <strong>Access-point markers:</strong> the 3 trailheads (Austin /
          Mountain Man / Zing) and the Brock Creek Lake recreation area.
          Coordinates from <strong>OpenStreetMap (ODbL)</strong> — a different
          license than the CC0 trail lines; see the PR for the mixed-license
          note. These render on the park detail Location tab from the
          <code> ParkMapMarker</code> table.
        </p>
      </footer>
    </div>
  );
}
