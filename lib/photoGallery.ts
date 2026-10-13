export type Photo = { id: string; storagePath: string; downloadURL: string; width: number; height: number; createdAt: number };
export type DraftPhoto = Photo & { uri?: string; mimeType?: string | null; fileSize?: number };
export const photoId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function validPhotoUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
export function readPhotos(data: any): Photo[] {
  // An explicit empty array hides removed legacy photos without deleting old fields.
  const source = Array.isArray(data?.galleryImages) ? data.galleryImages : Array.isArray(data?.images) ? data.images : Array.isArray(data?.imageUrls) ? data.imageUrls : Array.isArray(data?.photos) ? data.photos : data?.imageUrl ? [data.imageUrl] : [];
  const seen = new Set<string>();
  return source.flatMap((entry: any, index: number) => {
    if (entry?.access === 'premium') return [];
    const url = typeof entry === 'string' ? entry : entry?.downloadURL ?? entry?.url ?? entry?.imageUrl;
    if (!validPhotoUrl(url) || seen.has(url)) return [];
    seen.add(url);
    return [{ id: typeof entry?.id === 'string' ? entry.id : `legacy-${index}`, storagePath: typeof entry?.storagePath === 'string' ? entry.storagePath : '', downloadURL: url, width: Number.isFinite(entry?.width) && entry.width > 0 ? entry.width : 3, height: Number.isFinite(entry?.height) && entry.height > 0 ? entry.height : 4, createdAt: entry?.createdAt?.toMillis?.() ?? (typeof entry?.createdAt === "number" ? entry.createdAt : 0) }];
  });
}
export function nextPhotoIndex(index: number, dx: number, count: number, threshold = 40) {
  return Math.max(0, Math.min(count - 1, index + (dx < -threshold ? 1 : dx > threshold ? -1 : 0)));
}
