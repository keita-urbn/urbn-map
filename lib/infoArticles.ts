import { readPhotos, type Photo } from "./photoGallery";
import { safeImages, safeBlocks, type ArticleImage, type ArticleBlock } from "./articleContent";
export const INFO_CATEGORIES = [
  { key: 'shop', label: 'Store Information', collection: 'info_shop' },
  { key: 'event', label: 'Events', collection: 'info_event' },
  { key: 'size', label: 'Item Size Details', collection: 'info_size' },
  { key: 'trend', label: 'Trends', collection: 'info_trend' },
] as const;
export type InfoCategory = typeof INFO_CATEGORIES[number]['key'];
export const ARTICLE_SOURCES = [...INFO_CATEGORIES.map(c => c.collection), 'posts'];
export type InfoArticle = { id: string; source: string; kind: InfoCategory; title: string; hashtags: string[]; abstract: string; body: string; createdAt: number; publishedAt: number; published: boolean; authorName?: string; contentVersion?: number; publicImages: ArticleImage[]; publicBlocks: ArticleBlock[]; publicGalleryImageIds: string[]; legacyPublicImages: Photo[] };
export function mapInfoArticle(id: string, source: string, data: any, includeLegacyBody = true): InfoArticle {
  const timestamp = (value: any) => value?.toMillis?.() ?? (typeof value === 'number' ? value : 0);
  return { id, source, legacyPublicImages: readPhotos(data), kind: INFO_CATEGORIES.find(c => c.collection === source)?.key ?? (INFO_CATEGORIES.some(c => c.key === data.kind) ? data.kind : 'shop'), title: data.title ?? '', hashtags: Array.isArray(data.hashtags) ? data.hashtags : [], abstract: data.abstract ?? '', body: includeLegacyBody ? data.body ?? '' : '', authorName: data.authorName, contentVersion: data.contentVersion, publicGalleryImageIds: Array.isArray(data.publicGalleryImageIds) ? data.publicGalleryImageIds : [], publicImages: safeImages(data.publicImages).filter(i => i.access === "public"), publicBlocks: safeBlocks(data.publicBlocks).filter(b => b.type !== "image" || b.access === "public"), createdAt: timestamp(data.createdAt), publishedAt: timestamp(data.publishedAt ?? data.createdAt), published: data.published !== false };
}
export function filterInfoArticles(articles: InfoArticle[], category: InfoCategory | 'all', search: string, now = Date.now()) {
  const q = search.trim().toLowerCase();
  return articles.filter(a => a.published && a.publishedAt <= now && (category === 'all' || a.kind === category) && (!q || `${a.title} ${a.abstract} ${a.hashtags.join(' ')}`.toLowerCase().includes(q))).sort((a, b) => b.publishedAt - a.publishedAt || `${a.source}:${a.id}`.localeCompare(`${b.source}:${b.id}`));
}
