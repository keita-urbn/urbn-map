import type { ShopDoc } from '../types/shop';
const normalize = (v?: string) => (v ?? '').normalize('NFKC').trim().toLowerCase();
const brandTokens = (v?: string) => normalize(v).split(/[,、，;]+/).map(t => t.trim()).filter(Boolean);
const tokens = (v?: string) => normalize(v).split(/[,、，;\s・/]+/).filter(Boolean);
function distance(a: ShopDoc, b: ShopDoc) {
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite) || Math.abs(a.lat) > 90 || Math.abs(b.lat) > 90 || Math.abs(a.lng) > 180 || Math.abs(b.lng) > 180 || (a.lat === 0 && a.lng === 0) || (b.lat === 0 && b.lng === 0)) return Infinity;
  const rad = Math.PI / 180;
  const x = (a.lng - b.lng) * rad * Math.cos((a.lat + b.lat) * rad / 2);
  const y = (a.lat - b.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371;
}
// Deterministic metadata-only ranking: exact genre 100, overlapping style 50,
// shared brands 20 each (max 60), same area 10, proximity <=3km 5.
// Category/style always dominates geographic proximity. Zero-score results
// are omitted; ID breaks ties. This ranker can later accept behavioral signals.
export function relatedShops(current: ShopDoc, shops: ShopDoc[], limit = 8): ShopDoc[] {
  const seen = new Set([current.id]);
  const brands = new Set(brandTokens(current.brands));
  const styles = new Set(tokens(current.genre));
  return shops.filter(shop => {
    if (!shop.id || !shop.name?.trim() || seen.has(shop.id) || ![shop.lat, shop.lng].every(Number.isFinite) || Math.abs(shop.lat) > 90 || Math.abs(shop.lng) > 180 || (shop.lat === 0 && shop.lng === 0)) return false;
    seen.add(shop.id);
    return true; // Deleted records are absent from the existing live Firestore query; no active field exists.
  }).map(shop => {
    const genre = normalize(shop.genre), baseGenre = normalize(current.genre);
    const category = genre && baseGenre ? (genre === baseGenre ? 100 : tokens(shop.genre).some(t => styles.has(t)) ? 50 : 0) : 0;
    const shared = brandTokens(shop.brands).filter(t => brands.has(t));
    const sameArea = normalize(current.area) && normalize(current.area) === normalize(shop.area);
    return { shop, score: category + Math.min(new Set(shared).size * 20, 60) + (sameArea ? 10 : 0) + (distance(current, shop) <= 3 ? 5 : 0) };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.shop.id.localeCompare(b.shop.id)).slice(0, Math.max(0, limit)).map(item => item.shop);
}
