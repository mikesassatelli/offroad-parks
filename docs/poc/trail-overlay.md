# POC: OHV trail-network overlay (Brock Creek)

**Status:** working proof of concept, staged as **uncommitted changes** on
`claude/arkansas-ohv-data-model-174be1`. Nothing committed or pushed.

## See it in 30 seconds

```bash
npm run dev
```

Open **http://localhost:3000/poc/brock-creek**

You'll see the **Brock Creek Multi-Use Trail System** drawn on the existing
Leaflet map, styled by managed-use class:

- **Amber solid** = ATV/UTV open (the multi-use network around Brock Creek Lake)
- **Violet dashed** = motorcycle-only single-track (the northern network)

This matches the paper MVUM you shared (dotted moto trails north, multi-use
network south). Hover any segment for its name + allowed use + season.

> The page is **self-contained and has no database dependency**, so it renders
> regardless of local seed/DB state. (In this dev box `POSTGRES_PRISMA_URL`
> isn't set, so DB-backed pages like `/` error — the POC intentionally sidesteps
> that.)

## What's real vs. not — read this before trusting anything

| Element | Real? | Notes |
|---|---|---|
| **Trail geometry (23 segments, 3,928 vertices)** | ✅ **Real, CC0** | USFS NFS Trails via the Arkansas GeoStor mirror. Not hand-drawn. |
| **Per-segment managed-use styling** (ATV vs moto) | ✅ **Real** | Driven by the source's `atv` / `motorcycle` attributes. |
| **Trailhead + rec-area markers** (Austin / Mountain Man / Zing / Brock Creek Lake) | ✅ **Real, ODbL** | Coordinates from **OpenStreetMap** — matched the named features exactly. **Different license** than the trail lines (see licensing note). Not hand-placed. |

### ⚠️ Mixed-license note (needs your call)

The trail **lines** are CC0 (public domain, zero risk). The four **marker
coordinates** are from **OpenStreetMap → ODbL**, which carries attribution +
share-alike obligations for a commercial product — exactly the mixing the
research flagged. Each marker stores its provenance (`source`, `sourceRef`,
`license`) so this stays auditable, and the map already shows the `©
OpenStreetMap` attribution. If ODbL is a concern, the clean swap is the USFS
**Recreation Sites** layer (public domain) for these same points once that
endpoint is reachable from a non-blocked server.

The verified data source (per the overnight deep-research run):

- **USFS National Forest System Trails** is the primary source — public
  domain (CC0), ArcGIS REST, outputs GeoJSON directly, carries per-vehicle
  managed-use + seasonal attributes. **Zero commercial-licensing risk.**
- Its `apps.fs.usda.gov` EDW endpoint **bot-blocks this environment**
  (connection reset), so for the POC I used the **Arkansas GIS Office (GeoStor)
  state mirror** of the same USFS data, which serves the same schema as GeoJSON
  and is reachable here:

  ```
  https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Transportation/FeatureServer/14/query
    ?where=name LIKE '%BROCK CREEK%'
    &outFields=name,id,atv,motorcycle,fourwd_gt50,other_wheeled_ohv,seasonal,trail_class
    &outSR=4326&f=geojson
  ```

  Tradeoff: the GeoStor mirror was last refreshed **2021-06-08**; the national
  USFS feed is fresher for the same forest. For production, prefer the USFS EDW
  endpoint (from a non-blocked server IP) and keep GeoStor as fallback.

## Ranked data-source recommendation (for the 6 named AR systems)

1. **USFS National Forest System Trails (ArcGIS REST → GeoJSON), CC0.**
   Covers **Brock Creek, Moccasin Gap, Buckhorn, Wolf Pen Gap** (Ouachita NF),
   and Mulberry Mountain's *forest* trails. Build the pipeline here first.
2. **Arkansas GeoStor mirror** (`OZARKNFS_TRAILS_NFS`, layer 14) — same data,
   reachable when USFS bot-blocks; staler. Good fallback / dev source.
3. **Operator-provided GPX/KML** — the **only** non-hand-digitizing path for the
   two private parks (**3B Offroad**, and **Mulberry Mountain's own** private
   trails). This dovetails with the `Operator`/`ParkClaim` flow you already have:
   make "upload your trail file" an operator feature.
4. **OpenStreetMap** (Overpass) — good coverage, but **ODbL share-alike +
   attribution** is a real risk for a commercial dataset. Needs a legal call
   before mixing with CC0 data. Treat as supplementary only.
5. ❌ **Avenza** — **not a data source.** Its Map Store maps are rasterized
   georeferenced PDF (no exportable vector), and the EULA forbids commercial
   use, redistribution, extraction, and scripted access. It's a *viewer*. Where
   its OHV maps are public-domain USFS MVUMs, get that data free from USFS
   directly instead.
6. ❌ **onX / Trailforks / Gaia** — proprietary; scraping prohibited; licensing
   deals unconfirmed. Not a near-term path.

Full cited report (105 agents, 23/25 claims confirmed) is in the workflow
transcript; key licensing findings are summarized above.

## Files in this POC (all uncommitted)

| File | What |
|---|---|
| `src/features/map/components/TrailOverlay.tsx` | New. Renders trail LineStrings styled by managed-use. Source-agnostic. |
| `src/features/map/MapView.tsx` | **Edited (additive).** New optional props `trailOverlay`, `initialCenter`, `initialZoom`. **Existing callers unaffected** — all default to undefined. |
| `src/app/poc/brock-creek/page.tsx` | New. Self-contained POC page. |
| `public/poc/brock-creek-trails.geojson` | Real fetched geometry (156 KB) + provenance in its `metadata`. |

Typecheck: **0 new errors** from these files (the repo has 41 pre-existing
errors in unrelated `ai-research`/`admin` files). Lint: clean.

## Productionization path (NOT built — proposed)

This POC deliberately avoids a DB migration. To make it real:

1. **Schema** (the models we discussed — low blast radius, both new tables):
   ```prisma
   model ParkTrailGeometry {
     id            String   @id @default(cuid())
     parkId        String   @unique
     geojson       Json     // FeatureCollection of trail LineStrings
     sourceName    String?  // "USFS NFS Trails" / "GeoStor mirror" / "operator GPX"
     sourceUrl     String?
     publishedDate DateTime?  // authoritative-as-of
     importedAt    DateTime @default(now())
     park          Park @relation(fields: [parkId], references: [id], onDelete: Cascade)
   }

   model ParkMapMarker {           // trailheads + campground, when we source points
     id        String        @id @default(cuid())
     parkId    String
     type      MapMarkerType // TRAILHEAD | CAMPGROUND | STAGING | PARKING | GATE | POI
     name      String
     latitude  Float
     longitude Float
     notes     String?
     park      Park @relation(fields: [parkId], references: [id], onDelete: Cascade)
     @@index([parkId])
   }
   enum MapMarkerType { TRAILHEAD CAMPGROUND STAGING PARKING GATE POI }
   ```
2. **Ingestion script** (`scripts/import-nfs-trails.ts`) — query USFS EDW by
   forest/bbox → filter to the system → store GeoJSON + provenance. Mirror the
   existing `scripts/geocode-parks.ts` dry-run/`--commit` pattern.
3. **Wire into the park detail Location tab** — `ParkDetailPage` already renders
   `MapView`; pass `trailOverlay={park.trailGeometry?.geojson}`. Gate on presence.
4. **Serving at scale:** GeoJSON-in-`Json`-column is fine for dozens of systems
   (156 KB each). Revisit vector tiles (PMTiles) only at hundreds of systems.
5. **Trailhead/campground points:** source from USFS Recreation Sites layer OR
   operator upload → `ParkMapMarker`. `TrailOverlay` is already structured to
   accept a point layer.

## Open decisions for you

- **Vector vs. raster** long-term (I went vector — interactive, you own styling).
- **Where it renders** — park detail Location tab (recommended) and/or main map.
- **The Big Piney "district" grouping** — a `ManagingArea` entity groups parks
  by ranger district; orthogonal to this POC, add when you want to browse by it.
- **Private parks** — do you want to build the operator GPX-upload path, or
  defer 3B Offroad / Mulberry's private trails?
