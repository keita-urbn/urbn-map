import type { Photo } from './photoGallery';
function clean(value: unknown, seen = new Set<object>()): unknown {
  if (typeof value === 'string') return value.replace(/(?:Bearer|Firebase)\s+\S+/gi, '[REDACTED AUTH]').replace(/([?&]token=)[^&\s]+/gi, '$1[REDACTED]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED JWT]');
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]'; seen.add(value);
  return Object.fromEntries(Object.getOwnPropertyNames(value).map(key => [key, /token|credential|password|secret|authorization|private.?key|api.?key/i.test(key) ? '[REDACTED]' : clean((value as Record<string, unknown>)[key], seen)]));
}
export function logReviewFailure(stage: string, error: unknown, context: Record<string, unknown> = {}) {
  const e = error as { code?: unknown; message?: unknown; stack?: unknown } | null;
  console.error('[review-pipeline]', { ...context, stage, typeofError: typeof error, code: clean(e?.code), message: clean(e?.message), stack: clean(e?.stack), thrownValue: clean(error) });
}
export function submissionError(error: unknown): Error & { code?: string } {
  if (error instanceof Error) return error;
  const value = error as { message?: unknown; code?: unknown } | null;
  const result: Error & { code?: string } = new Error(typeof value?.message === 'string' ? value.message : typeof error === 'string' ? error : 'レビュー投稿中に不明なエラーが発生しました');
  if (typeof value?.code === 'string') result.code = value.code;
  return result;
}
export function reviewImageMetadata(images: Photo[], prefix: string): Photo[] {
  if (images.length > 5) throw new Error('レビュー写真は5枚までです');
  const seen = new Set<string>();
  return images.map(image => {
    if (!image || typeof image.id !== 'string' || !image.id || typeof image.storagePath !== 'string' || !image.storagePath.startsWith(prefix) || image.storagePath.slice(prefix.length).includes('/') || !image.storagePath.slice(prefix.length) || seen.has(image.storagePath) || typeof image.downloadURL !== 'string' || !/^https:\/\//.test(image.downloadURL) || !Number.isFinite(image.width) || image.width <= 0 || !Number.isFinite(image.height) || image.height <= 0 || !Number.isFinite(image.createdAt)) throw new Error('レビュー画像の保存情報が不正です');
    try { if (new URL(image.downloadURL).protocol !== "https:") throw new Error(); } catch { throw new Error("レビュー画像URLが不正です"); }
    seen.add(image.storagePath);
    return { id: image.id, storagePath: image.storagePath, downloadURL: image.downloadURL, width: image.width, height: image.height, createdAt: image.createdAt };
  });
}
