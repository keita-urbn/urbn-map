import { collection, deleteField, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { safeBlocks, safeImages, type ArticleBlock, type ArticleImage } from './articleContent';
import { deleteArticleImage, uploadArticleImage } from './articleStorage';
export type DraftArticleImage = ArticleImage & { uri?: string; mimeType?: string | null; fileSize?: number };
export const privateArticleRef = (source: string, id: string) => doc(db, source, id, 'private', 'content');
export async function loadPrivateArticle(source: string, id: string) {
  const snapshot = await getDoc(privateArticleRef(source, id)); const data = snapshot.data();
  return { body: typeof data?.body === 'string' ? data.body : '', bodyBlocks: safeBlocks(data?.bodyBlocks), premiumImages: safeImages(data?.premiumImages) };
}
export async function saveArticle(input: { source: string; id?: string; title: string; hashtags: string[]; abstract: string; body: string; kind: string; publicBlocks: ArticleBlock[]; bodyBlocks: ArticleBlock[]; images: DraftArticleImage[]; previousImages: ArticleImage[] }) {
  if (input.images.length > 10) throw new Error("記事の画像は合計10枚までです");
  const article = input.id ? doc(db, input.source, input.id) : doc(collection(db, input.source));
  const uploaded: ArticleImage[] = []; const images: ArticleImage[] = [];
  let committed = false;
  try {
    for (const draft of input.images) {
      if (draft.uri) {
        const image = await uploadArticleImage(input.source, article.id, draft.access, { ...draft, uri: draft.uri });
        uploaded.push(image); images.push({ ...image, id: draft.id });
      } else images.push({ id: draft.id, path: draft.path, access: draft.access, width: draft.width, height: draft.height });
    }
    const batch = writeBatch(db);
    const publicFields = { title: input.title.trim(), hashtags: input.hashtags, abstract: input.abstract.trim(), contentVersion: 2, publicImages: images.filter(i => i.access === 'public'), publicBlocks: input.publicBlocks, publicGalleryImageIds: images.filter(i => i.access === "public" && !input.bodyBlocks.some(b => b.type === "image" && b.imageId === i.id)).map(i => i.id) };
    if (input.id) batch.update(article, { ...publicFields, body: deleteField() });
    else batch.set(article, { ...publicFields, kind: input.kind, authorName: 'admin', createdAt: serverTimestamp() });
    batch.set(privateArticleRef(input.source, article.id), { body: input.body.trim(), bodyBlocks: input.bodyBlocks, premiumImages: images.filter(i => i.access === 'premium') });
    await batch.commit(); committed = true;
    const removed = input.previousImages.filter(previous => !images.some(image => image.path === previous.path));
    const cleanup = await Promise.allSettled(removed.map(image => deleteArticleImage(input.source, article.id, image)));
    return { id: article.id, images, cleanupFailed: cleanup.some(result => result.status === 'rejected') };
  } catch (error) {
    if (!committed) {
      const cleanup = await Promise.allSettled(uploaded.map(image => deleteArticleImage(input.source, article.id, image)));
      if (cleanup.some(result => result.status === 'rejected')) throw new Error(`保存失敗。画像削除の再試行が必要です: ${uploaded.map(i => i.path).join(', ')}`);
    }
    throw error;
  }
}
export async function removeArticle(source: string, id: string, publicImages: ArticleImage[]) {
  const privateContent = await loadPrivateArticle(source, id);
  const batch = writeBatch(db); batch.delete(doc(db, source, id)); batch.delete(privateArticleRef(source, id)); await batch.commit();
  const results = await Promise.allSettled([...publicImages, ...privateContent.premiumImages].map(image => deleteArticleImage(source, id, image)));
  return results.some(result => result.status === 'rejected');
}
