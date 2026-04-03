/** Google Maps directions: prefer exact coordinates when present. */
export function mapsDirUrl(
  originText: string,
  destText: string,
  originLat?: number | null,
  originLng?: number | null,
  destLat?: number | null,
  destLng?: number | null,
): string {
  const origin =
    originLat != null && originLng != null
      ? `${originLat},${originLng}`
      : originText;
  const dest =
    destLat != null && destLng != null ? `${destLat},${destLng}` : destText;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`;
}
