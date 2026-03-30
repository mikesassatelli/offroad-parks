/**
 * Calculates the great-circle distance between two coordinates using the
 * Haversine formula. Returns distance in miles.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in miles for display.
 * Under 10 miles: one decimal place (e.g. "4.2 mi")
 * 10+ miles: rounded to nearest integer (e.g. "142 mi")
 */
export function formatDistance(miles: number): string {
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}
