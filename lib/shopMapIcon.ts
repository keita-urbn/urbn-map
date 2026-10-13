import { getDoc, doc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { auth, db, storage } from './firebase';
export type IconChange = { uri: string } | null | undefined;
export async function deleteMapIcon(path: string, shopId: string) {
  if (!path.startsWith(`shops/${shopId}/map-icon/`)) return;
  try { await deleteObject(ref(storage, path)); }
  catch (e) { if ((e as { code?: string }).code !== 'storage/object-not-found') throw e; }
}
export async function uploadMapIcon(shopId: string, uri: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('ログインしてください。');
  const profile = await getDoc(doc(db, 'users', user.uid));
  if (profile.data()?.role !== 'admin') throw new Error('管理者権限が必要です。');
  const path = `shops/${shopId}/map-icon/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  try {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      if (blob.type !== 'image/jpeg' || blob.size > 1024 * 1024 || !blob.size) throw new Error('JPEG画像は1MB以下にしてください。');
      await uploadBytes(ref(storage, path), blob, { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000,immutable' });
    } else {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || !info.size || info.size > 1024 * 1024 || !/\.jpe?g(?:[?#]|$)/i.test(uri)) throw new Error('JPEG画像は1MB以下にしてください。');
      const bucket = storage.app.options.storageBucket;
      const result = await FileSystem.uploadAsync(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(path)}`, uri, {
        httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'image/jpeg' },
      });
      if (result.status < 200 || result.status >= 300) throw new Error(`アイコンのアップロードに失敗しました (${result.status})。`);
    }
    return { mapIconUrl: await getDownloadURL(ref(storage, path)), mapIconPath: path };
  } catch (e) {
    try { await deleteMapIcon(path, shopId); }
    catch { throw new Error(`アイコン保存失敗。Storageの未完了ファイルを削除できませんでした: ${path}`); }
    throw e;
  }
}
