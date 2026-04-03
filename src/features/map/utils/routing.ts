export type RouteResult = {
  geometry: GeoJSON.LineString;
  distanceMi: number;
  durationMin: number;
};

export async function fetchMapboxRoute(
  waypoints: { lat: number; lng: number }[]
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn("NEXT_PUBLIC_MAPBOX_TOKEN not set");
    return null;
  }

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?access_token=${token}&geometries=geojson&overview=full`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes?.[0]) return null;

    const route = data.routes[0];
    return {
      geometry: route.geometry as GeoJSON.LineString,
      distanceMi: Math.round(route.distance * 0.000621371 * 10) / 10,
      durationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

export async function geocodeLocation(
  query: string
): Promise<{ label: string; lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const encoded = encodeURIComponent(query);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1&country=US`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features?.[0]) return null;

    const feature = data.features[0];
    const [lng, lat] = feature.center;
    return { label: feature.place_name, lat, lng };
  } catch {
    return null;
  }
}

export async function geocodeSuggestions(
  query: string,
  limit = 5
): Promise<{ label: string; lat: number; lng: number }[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || query.trim().length < 2) return [];

  const encoded = encodeURIComponent(query.trim());
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=${limit}&country=US&autocomplete=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.features?.length) return [];

    return data.features.map((f: { place_name: string; center: [number, number] }) => {
      const [lng, lat] = f.center;
      return { label: f.place_name, lat, lng };
    });
  } catch {
    return [];
  }
}
