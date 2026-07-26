# USFS trail & recreation data — source reference

Everything the trail-overlay feature ingests, where it comes from, how to reach
it, and its limits. Written 2026-07-25.

## The authoritative dataset: USFS National Forest System (NFS) Trails

- **What it is:** every trail the U.S. Forest Service manages, nationwide, as
  **vector polylines** — one feature per trail segment. Each segment carries the
  managed-use attributes we style on (`ATV_MANAGED`, `MOTORCYCLE_MANAGED`,
  `FOURWD_MANAGED`, …), a trail number, a name, and seasonal windows. It is the
  digital backing of the paper **MVUM** (Motor Vehicle Use Map).
- **Publisher / authority:** USFS Enterprise Data Warehouse (EDW). Updated on a
  rolling basis as each Forest edits its data (no fixed national cadence).
- **License:** **Public domain — CC0 1.0** + 17 U.S.C. §105 (federal work).
  Commercial use, no attribution or share-alike required. **Zero licensing
  risk** — this is why it's our foundation.
- **Companion layers (same EDW, same license):**
  - **Recreation Sites / Trailheads** — the point features (trailheads,
    campgrounds, staging). This is what should back `ParkMapMarker`.
  - **MVUM Roads** — motorized roads (vs. the trails layer).

### How to access it

| Path | Endpoint | Format | Reachable from our build env? |
|---|---|---|---|
| **EDW ArcGIS REST** (authoritative, national, freshest) | `https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0/query` | `f=geojson`, `outSR=4326` | ❌ **Currently unreliable** — bot-blocks sandboxed `curl` (connection reset) and was returning **HTTP 500 / "could not access any server machines"** during this work (a USFS-side outage). Works from a normal server IP when healthy. |
| **FSGeodata downloads** | `https://data.fs.usda.gov/geodata/edw/...` (shapefile / file-geodatabase) | SHP / FGDB (national, large) | ✅ Host is up, but national-only bulk files; needs GDAL/`ogr2ogr` to convert (not installed here). |
| **USFS ArcGIS Online org** | `https://services1.arcgis.com/gGHDlz6USftL5Pau/...` | GeoJSON | ✅ Reachable, but the *national* NFS-Trails item just proxies back to the blocked `apps.fs` URL; only per-forest hosted layers are truly AGOL-served. |
| **Arkansas GeoStor mirror** (what we use today) | `https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Transportation/FeatureServer/14/query` (`OZARKNFS_TRAILS_NFS`) | `f=geojson` | ✅ **Reachable & reliable.** State mirror of the USFS Ozark–St. Francis NF trails. |

### Example query (GeoStor mirror, WGS84 GeoJSON)

```
.../FeatureServer/14/query
  ?geometry=<W>,<S>,<E>,<N>&geometryType=esriGeometryEnvelope&inSR=4326
  &spatialRel=esriSpatialRelIntersects
  &outFields=name,id,atv,motorcycle,fourwd_gt50,other_wheeled_ohv,seasonal,trail_class
  &outSR=4326&returnGeometry=true&f=geojson
```

## Limitations & gotchas (learned the hard way)

1. **EDW is flaky.** Expect connection resets and 5xx from `apps.fs.usda.gov`.
   Any pipeline must retry and tolerate outages. During this work it was fully
   down, which is why Ouachita NF (Wolf Pen Gap) and the public-domain
   Recreation-Sites points could not be pulled yet.
2. **The GeoStor mirror is Ozark–St. Francis NF ONLY.** It does **not** contain
   the **Ouachita NF** (Wolf Pen Gap) or any other forest. Those need EDW.
3. **The mirror is staler than EDW** (last refreshed 2021-06-08). Fine for
   geometry, but not the freshest managed-use/seasonal state.
4. **Trail *names* are inconsistent / abbreviated.** Brock Creek segments are
   `BROCK CREEK #NN`, but Moccasin Gap uses `MG …` / `MOCC …`, and Buckhorn
   isn't name-tagged at all. **Extract spatially (by bounding box), not by
   name.**
5. **Segments are topologically disconnected** — you cannot reliably derive
   trailhead points from where lines meet. Trailheads must come from the
   Recreation-Sites point layer (or operator data), not the trail geometry.
6. **Park coordinates can be wrong.** Brock Creek's stored park coord sits ~8 km
   south of its actual trail network; Buckhorn's yields no nearby NFS trails at
   all. Use a generous bbox and sanity-check the returned names.
7. **No open GIS for private parks.** 3B Offroad and Mulberry Mountain's own
   trails aren't in any federal/state dataset — only operator-provided GPX/KML.

## What NOT to use, and why

- **OpenStreetMap** — great coverage, but **ODbL** (attribution + share-alike) is
  a real risk for a commercial product. We used it for 4 Brock Creek marker
  points as a stopgap and are swapping them to public-domain USFS Recreation
  Sites. Do not mix ODbL geometry into the served dataset without a legal call.
- **Avenza** — a *viewer* for rasterized georeferenced PDFs. EULA forbids
  commercial use, redistribution, extraction, and scripted access. **Not a data
  source.** Where its OHV maps are public-domain USFS MVUMs, get that data from
  USFS directly.
- **onX / Trailforks / Gaia** — proprietary; scraping prohibited; no confirmed
  data-licensing path.

## Current coverage in the app

| System | Forest | Trail lines | Markers |
|---|---|---|---|
| Brock Creek | Ozark–St. Francis | ✅ GeoStor (in DB) | ⚠️ OSM stopgap → **swap to USFS Rec Sites pending EDW** |
| Moccasin Gap | Ozark–St. Francis | ✅ GeoStor (in DB) | ⏳ pending USFS Rec Sites (EDW) |
| Buckhorn | Ozark–St. Francis | ⏳ park coord looks wrong — needs verification | ⏳ pending |
| Wolf Pen Gap | **Ouachita** | ⏳ **needs EDW** (not in GeoStor mirror) | ⏳ pending |
| Mulberry Mountain, 3B Offroad | private | ❌ no open GIS — operator GPX only | ❌ operator only |
