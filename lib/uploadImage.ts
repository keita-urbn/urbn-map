// lib/uploadImage.ts
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

/**
 * 画像をFirebase StorageにアップロードしてURLを返す
 */
export default async function uploadImage(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();

  const filename = `shops/${Date.now()}.jpg`;
  const imageRef = ref(storage, filename);

  await uploadBytes(imageRef, blob);
  const url = await getDownloadURL(imageRef);

  return url;
}

