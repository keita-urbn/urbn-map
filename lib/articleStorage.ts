import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { deleteObject, ref, uploadBytes, updateMetadata, getMetadata } from 'firebase/storage';
import { Platform } from 'react-native';
import { auth, db, storage } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { contentId, type ArticleImage } from './articleContent';
export const articleMediaPrefix = (source: string, id: string) => `articles/${source}/${id}/`;
export async function uploadArticleImage(source: string, articleId: string, access: ArticleImage['access'], asset: { uri: string; width: number; height: number; fileSize?: number; mimeType?: string | null }): Promise<ArticleImage> {
  if (!auth.currentUser || (await getDoc(doc(db, 'users', auth.currentUser.uid))).data()?.role !== 'admin') throw new Error('管理者権限が必要です');
  if (asset.mimeType && !/^image\/(jpeg|png|webp|heic|heif)$/.test(asset.mimeType)) throw new Error('対応する画像を選んでください');
  const size = Platform.OS === 'web' ? (await (await fetch(asset.uri)).blob()).size : await FileSystem.getInfoAsync(asset.uri).then(info => info.exists ? info.size : 0);
  if (!size || size > 20 * 1024 * 1024) throw new Error('20MB以下の画像を選んでください');
  const image = await manipulateAsync(asset.uri, [{ resize: asset.width >= asset.height ? { width: Math.min(asset.width, 1600) } : { height: Math.min(asset.height, 1600) } }], { format: SaveFormat.JPEG, compress: .85 });
  const id = contentId(); const path = `${articleMediaPrefix(source, articleId)}${access}/${id}.jpg`;
  try {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(image.uri)).blob();
      if (blob.size > 5 * 1024 * 1024) throw new Error('圧縮画像は5MB以下にしてください');
      await uploadBytes(ref(storage, path), blob, { contentType: 'image/jpeg', cacheControl: access === 'premium' ? 'private,no-store' : 'public,max-age=31536000' });
    } else {
      const info = await FileSystem.getInfoAsync(image.uri);
      if (!info.exists || info.size > 5 * 1024 * 1024) throw new Error('圧縮画像は5MB以下にしてください');
      const result = await FileSystem.uploadAsync(objectEndpoint(path), image.uri, { httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers: { Authorization: `Firebase ${await auth.currentUser.getIdToken()}`, 'Content-Type': 'image/jpeg' } });
      if (result.status < 200 || result.status >= 300) throw new Error(`アップロード失敗 (${result.status})`);
    }
    if (access === 'premium') {
      await updateMetadata(ref(storage, path), { cacheControl: 'private,no-store', customMetadata: { firebaseStorageDownloadTokens: '' } });
      const metadata = await getMetadata(ref(storage, path));
      if (metadata.customMetadata?.firebaseStorageDownloadTokens) throw new Error('Premium画像の公開トークンを除去できませんでした');
    }
    return { id, path, access, width: image.width, height: image.height };
  } catch (error) {
    try { await deleteObject(ref(storage, path)); } catch (cleanupError) { if ((cleanupError as { code?: string }).code !== 'storage/object-not-found') throw new Error(`画像保存失敗。Storage削除を確認してください: ${path}`); }
    throw error;
  }
}
function objectEndpoint(path: string) { return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(storage.app.options.storageBucket)}/o?uploadType=media&name=${encodeURIComponent(path)}`; }
export async function deleteArticleImage(source: string, id: string, image: ArticleImage) {
  if (!image.path.startsWith(articleMediaPrefix(source, id))) throw new Error('この記事以外の画像は削除できません');
  try { await deleteObject(ref(storage, image.path)); } catch (e) { if ((e as { code?: string }).code !== 'storage/object-not-found') throw e; }
}
/** Never creates or persists a Firebase download-token URL. Rules authorize every request. */
export async function readArticleImage(image: ArticleImage): Promise<{ uri: string; dispose: () => void }> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  if (image.access === 'premium' && !token) throw new Error('Premiumへのログインが必要です');
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(storage.app.options.storageBucket)}/o/${encodeURIComponent(image.path)}?alt=media`;
  const headers: Record<string, string> = token ? { Authorization: `Firebase ${token}` } : {};
  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers, cache: 'no-store' });
    if (!response.ok) throw new Error('画像へのアクセスが拒否されました');
    const uri = URL.createObjectURL(await response.blob()); return { uri, dispose: () => URL.revokeObjectURL(uri) };
  }
  const uri = `${FileSystem.cacheDirectory}article-${contentId()}.jpg`;
  try {
    const response = await FileSystem.downloadAsync(url, uri, { headers });
    if (response.status !== 200) throw new Error('画像へのアクセスが拒否されました');
  } catch (error) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    throw error;
  }
  return { uri, dispose: () => { void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); } };
}
