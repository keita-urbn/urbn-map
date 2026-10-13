export type ArticleImage = { id: string; path: string; access: 'public' | 'premium'; width: number; height: number };
export type ArticleBlock = { id: string; type: 'text'; text: string } | { id: string; type: 'image'; imageId: string; access: 'public' | 'premium' };
export const contentId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function safeImages(value: unknown): ArticleImage[] {
  return Array.isArray(value) ? value.filter(i => i && typeof i.id === 'string' && typeof i.path === 'string' && /^articles\/[^/]+\/[^/]+\/(public|premium)\/[^/]+$/.test(i.path) && i.path.split('/')[3] === i.access && (i.access === 'public' || i.access === 'premium') && Number.isFinite(i.width) && i.width > 0 && Number.isFinite(i.height) && i.height > 0) : [];
}
export function safeBlocks(value: unknown): ArticleBlock[] {
  return Array.isArray(value) ? value.filter(b => b && typeof b.id === 'string' && (b.type === 'text' && typeof b.text === 'string' || b.type === 'image' && typeof b.imageId === 'string' && (b.access === 'public' || b.access === 'premium'))) : [];
}
export function removeImageReferences(blocks: ArticleBlock[], imageId: string) { return blocks.filter(b => b.type !== 'image' || b.imageId !== imageId); }
export function reorder<T>(items: T[], index: number, delta: number) {
  const next = [...items]; const to = index + delta;
  if (to < 0 || to >= next.length) return next;
  [next[index], next[to]] = [next[to], next[index]]; return next;
}
