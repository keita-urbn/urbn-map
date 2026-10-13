import type { ShopDoc } from '../types/shop';
export const PRIORITY_CONFIG = { favorites: .35, routes: .35, rating: .30, mediumQuantile: .5, highQuantile: .8, reviewConfidence: 10 };
export const PRIORITY_COLORS = { low: '#A7E4BD', medium: '#F5E4A0', high: '#F4B5D3' };
export type Priority = { score: number; tier: keyof typeof PRIORITY_COLORS };
const positive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0;
export function rankMarkers(shops: ShopDoc[], config = PRIORITY_CONFIG): Record<string, Priority> {
  const metrics = shops.map(s => [positive(s.favoriteCount), positive(s.routeClickCount), Math.min(5, positive(s.ratingAverage)) / 5 * positive(s.ratingCount) / (positive(s.ratingCount) + config.reviewConfidence)]);
  const maxima = [0, 1, 2].map(i => Math.max(0, ...metrics.map(m => m[i])));
  const total = config.favorites + config.routes + config.rating;
  const scores = metrics.map(m => total > 0 ? m.reduce((sum, n, i) => sum + (maxima[i] ? n / maxima[i] : 0) * [config.favorites, config.routes, config.rating][i], 0) / total : 0);
  const valid = scores.filter(n => n > 0).sort((a, b) => a - b);
  const quantile = (q: number) => {
    if (!valid.length) return Infinity;
    const index = (valid.length - 1) * Math.max(0, Math.min(1, q));
    const lower = Math.floor(index);
    return valid[lower] + (valid[Math.ceil(index)] - valid[lower]) * (index - lower);
  };
  return Object.fromEntries(shops.map((s, i) => [s.id, { score: scores[i], tier: scores[i] <= 0 ? 'low' : valid.length >= 3 && scores[i] > quantile(config.highQuantile) ? 'high' : valid.length >= 2 && valid[0] < valid[valid.length - 1] && scores[i] >= quantile(config.mediumQuantile) ? 'medium' : 'low' }]));
}
export type MarkerPoint = { shop: ShopDoc; x: number; y: number };
/** Shared screen-space placement. Selected shop always wins; zoom changes spacing. */
export function placeMarkers(points: MarkerPoint[], priorities: Record<string, Priority>, zoom: number, selectedId?: string) {
  const occupied: { x: number; y: number; w: number; h: number }[] = [];
  const ordered = [...points].sort((a, b) => Number(b.shop.id === selectedId) - Number(a.shop.id === selectedId) || (priorities[b.shop.id]?.score ?? 0) - (priorities[a.shop.id]?.score ?? 0) || a.shop.id.localeCompare(b.shop.id));
  const markers: (MarkerPoint & { label: boolean })[] = [];
  for (const p of ordered) {
    const selected = p.shop.id === selectedId;
    const spacing = zoom < 13 ? 42 : zoom < 15 ? 32 : 20;
    if (!selected && markers.some(m => Math.abs(m.x - p.x) < spacing && Math.abs(m.y - p.y) < spacing)) continue;
    const box = { x: p.x + 25, y: p.y - 18, w: 125, h: 38 };
    const label = selected || zoom >= 13 && !occupied.some(b => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y);
    if (label) occupied.push(box);
    // Reserve the circular marker too, so later labels cannot cover it.
    occupied.push({ x: p.x - 24, y: p.y - 24, w: 48, h: 48 });
    markers.push({ ...p, label });
  }
  return markers;
}
