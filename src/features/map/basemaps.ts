/**
 * Basemap tile layers offered by the map's layer switcher.
 *
 * All three are keyless and free to use for this scale, so no API key or
 * metered map SDK is involved. The off-road audience benefits from imagery and
 * topography, not just the road-only street map.
 *
 * The first entry is the default (checked) layer.
 */
export interface Basemap {
  /** Label shown in the layer control. */
  name: string;
  /** Leaflet tile URL template. */
  url: string;
  /** Attribution HTML shown while this layer is active. */
  attribution: string;
  /** Max zoom the tile source serves. */
  maxZoom: number;
  /** Tile subdomains, when the URL uses `{s}`. */
  subdomains?: string;
}

export const BASEMAPS: readonly Basemap[] = [
  {
    name: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: "abc",
  },
  {
    name: "Satellite",
    // Esri World Imagery uses {z}/{y}/{x} ordering (y before x) — not the usual
    // {z}/{x}/{y}. Swapping them silently returns the wrong tiles.
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
  {
    name: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org/">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    subdomains: "abc",
  },
] as const;
