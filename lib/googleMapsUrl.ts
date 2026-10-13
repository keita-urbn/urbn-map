/** Explicit hosts and paths: never trust suffix matching or substring checks. */
export function validGoogleMapsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
    const host = url.hostname;
    const mapsPath = /^\/maps(?:\/|$)/.test(url.pathname);
    const valid = (['google.com', 'www.google.com', 'google.co.jp', 'www.google.co.jp'].includes(host) && mapsPath)
      || (['maps.google.com', 'maps.google.co.jp'].includes(host))
      || (host === 'maps.app.goo.gl' && /^\/[^/]+\/?$/.test(url.pathname))
      || (host === 'goo.gl' && /^\/maps\/[^/]+\/?$/.test(url.pathname));
    return valid ? value.trim() : undefined;
  } catch { return undefined; }
}
export function registeredDirectionsUrl(value: unknown, mode: 'walking' | 'driving' | 'transit'): string | undefined {
  const valid = validGoogleMapsUrl(value);
  if (!valid) return undefined;
  const url = new URL(valid);
  if (url.hostname === 'maps.app.goo.gl' || url.hostname === 'goo.gl') return undefined;
  const params = url.searchParams;
  let destination = params.get('destination') || params.get('query') || params.get('q');
  const placeId = params.get('destination_place_id') || params.get('query_place_id');
  if (destination?.startsWith('place_id:')) return undefined;
  // !3d/!4d describe the place; @lat,lng describes the camera, not the destination.
  if (!destination) {
    const match = url.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (match && Math.abs(Number(match[1])) <= 90 && Math.abs(Number(match[2])) <= 180) destination = `${match[1]},${match[2]}`;
  }
  if (!destination?.trim() && !placeId) return undefined;
  const result = new URL('https://www.google.com/maps/dir/');
  result.searchParams.set('api', '1');
  result.searchParams.set('destination', destination?.trim() || placeId!);
  if (placeId) result.searchParams.set('destination_place_id', placeId);
  result.searchParams.set('travelmode', mode);
  return result.toString();
}
/** Missing fields remain absent; a deliberate blank clears a registered value. */
export function googleMapsUrlField(value: string | undefined): { googleMapsUrl?: string } {
  if (value === undefined) return {};
  if (!value.trim()) return { googleMapsUrl: '' };
  const valid = validGoogleMapsUrl(value);
  if (!valid) throw new Error('有効なGoogle Maps URLを入力してください');
  return { googleMapsUrl: valid };
}
