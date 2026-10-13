import { logReviewFailure } from "./reviewDiagnostics";
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { doc, getDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Platform } from 'react-native';
import { auth, db, storage } from './firebase';
import { photoId, type DraftPhoto, type Photo } from './photoGallery';
export const shopPhotoPrefix = (id: string) => `shops/${id}/gallery/`;
export const reviewPhotoPrefix = (shopId: string, uid: string) => `reviews/${shopId}/${uid}/images/`;
export async function deletePhotos(prefix: string, images: Photo[]) {
  const results = await Promise.allSettled(images.filter(i => i.storagePath).map(async image => {
    if (!image.storagePath.startsWith(prefix) || image.storagePath.slice(prefix.length).includes('/')) throw new Error('別の店舗・レビューの画像は削除できません');
    try { await deleteObject(ref(storage, image.storagePath)); } catch (e) { if ((e as { code?: string }).code !== 'storage/object-not-found') throw e; }
  }));
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length) {
    if (prefix.startsWith('reviews/')) for (const result of failures) logReviewFailure('storage-cleanup', result.reason, { prefix });
    throw new Error('Storage画像の削除に失敗しました。管理者による再試行が必要です');
  }
}
async function uploadPhoto(prefix: string, draft: DraftPhoto): Promise<Photo> {
  let stage = "image-validation";
  let uploaded = false;
  let storagePath = "";
  let processedUri: string | undefined;
  try {
  if (!draft.uri || !draft.id || !Number.isFinite(draft.width) || draft.width <= 0 || !Number.isFinite(draft.height) || draft.height <= 0) throw new Error("画像の選択情報が不正です");
  if (draft.mimeType && !/^image\/(jpeg|png|webp|heic|heif)$/.test(draft.mimeType)) throw new Error('対応する画像を選んでください');
  stage = "source-read";
  const size = Platform.OS === 'web' ? (await (await fetch(draft.uri!)).blob()).size : await FileSystem.getInfoAsync(draft.uri!).then(info => info.exists ? info.size : 0);
  if (!size || size > 20 * 1024 * 1024) throw new Error('20MB以下の画像を選んでください');
  stage = "image-processing";
  const image = await manipulateAsync(draft.uri!, [{ resize: draft.width >= draft.height ? { width: Math.min(draft.width, 1600) } : { height: Math.min(draft.height, 1600) } }], { compress: .85, format: SaveFormat.JPEG });
  processedUri = image.uri;
  storagePath = `${prefix}${photoId()}.jpg`;
  stage = "storage-upload";
    if (Platform.OS === 'web') {
      const bytes = await (await fetch(image.uri)).blob();
      if (bytes.size > 5 * 1024 * 1024) throw new Error('圧縮画像が5MBを超えています');
      await uploadBytes(ref(storage, storagePath), bytes, { contentType: 'image/jpeg' });
      uploaded = true;
    } else {
      const info = await FileSystem.getInfoAsync(image.uri);
      if (!info.exists || info.size > 5 * 1024 * 1024) throw new Error('圧縮画像が5MBを超えています');
      const result = await FileSystem.uploadAsync(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(storage.app.options.storageBucket)}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`, image.uri, { httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers: { Authorization: `Firebase ${await auth.currentUser.getIdToken()}`, 'Content-Type': 'image/jpeg' } });
      if (result.status < 200 || result.status >= 300) {
        const error: Error & { code?: string } = new Error(`Storageアップロード失敗 (${result.status})`);
        error.code = result.status === 401 ? "storage/unauthenticated" : result.status === 403 ? "storage/unauthorized" : `storage/http-${result.status}`;
        throw error;
      }
      uploaded = true;
    }
    stage = "download-url";
    return { id: draft.id, storagePath, downloadURL: await getDownloadURL(ref(storage, storagePath)), width: image.width, height: image.height, createdAt: Date.now() };
  } catch (error) {
    if (prefix.startsWith("reviews/")) logReviewFailure(stage, error, { prefix, storagePath, uid: auth.currentUser?.uid, imageId: draft.id });
    if (uploaded) {
      try { await deletePhotos(prefix, [{ ...draft, storagePath }]); }
      catch (cleanupError) { if (prefix.startsWith("reviews/")) logReviewFailure("upload-rollback", cleanupError, { prefix, storagePath }); }
    }
    throw error;
  } finally {
    if (Platform.OS !== 'web' && processedUri) await FileSystem.deleteAsync(processedUri, { idempotent: true }).catch(() => {});
  }
}
/** Stage all files before committing references; caller owns commit and rollback. */
export async function preparePhotos(prefix: string, drafts: DraftPhoto[], maximum: number) {
  if (!auth.currentUser) throw new Error('ログインが必要です');
  const isShop = /^shops\/[^/]+\/gallery\/$/.test(prefix);
  if (isShop) {
    if ((await getDoc(doc(db, 'users', auth.currentUser.uid))).data()?.role !== 'admin') throw new Error('管理者権限が必要です');
  } else if (!/^reviews\/[^/]+\/[^/]+\/images\/$/.test(prefix) || prefix.split('/')[2] !== auth.currentUser.uid) throw new Error('画像の所有者が一致しません');
  if (drafts.length > maximum) throw new Error(`画像は${maximum}枚までです`);
  const uploaded: Photo[] = []; const images: Photo[] = [];
  try {
    for (const draft of drafts) {
      if (draft.uri) { const image = await uploadPhoto(prefix, draft); uploaded.push(image); images.push(image); }
      else {
        if (draft.storagePath && !draft.storagePath.startsWith(prefix)) throw new Error('別の店舗・レビューの画像は使用できません');
        images.push({ id: draft.id, storagePath: draft.storagePath, downloadURL: draft.downloadURL, width: draft.width, height: draft.height, createdAt: draft.createdAt });
      }
    }
    return { images, rollback: () => deletePhotos(prefix, uploaded) };
  } catch (error) {
    try { await deletePhotos(prefix, uploaded); }
    catch (cleanupError) { if (prefix.startsWith("reviews/")) logReviewFailure("batch-upload-rollback", cleanupError, { prefix, uploadedPaths: uploaded.map(i => i.storagePath) }); }
    throw error;
  }
}
