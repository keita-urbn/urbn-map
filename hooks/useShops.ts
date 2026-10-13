import { readPhotos, type DraftPhoto } from "../lib/photoGallery";
import { preparePhotos, deletePhotos, shopPhotoPrefix } from "../lib/photoStorage";
import { googleMapsUrlField } from "../lib/googleMapsUrl";
import { uploadMapIcon, deleteMapIcon, type IconChange } from "../lib/shopMapIcon";
import { validateBusinessHours } from "../lib/businessHours";
// hooks/useShops.ts
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

import { db } from "../lib/firebase";
import uploadImage from "../lib/uploadImage";
import type { ShopDoc } from "../types/shop";

const COL = "shops";
// Firestore Query objects are referentially distinct even when they describe
// the same query. Keep one shared instance so snapshot-driven renders do not
// tear down and recreate the listener.
const SHOPS_QUERY = query(collection(db, COL), orderBy("name", "asc"));

/* Firestore → アプリ用 ShopDoc 変換 */
function mapShop(id: string, data: any): ShopDoc {
  return {
    id,
    name: data?.name ?? "",
    area: data?.area ?? "",
    genre: data?.genre ?? "",
    address: data?.address ?? "",
    brands: data?.brands ?? "",
    instagram: data?.instagram ?? "",
    googleMapsUrl: typeof data?.googleMapsUrl === "string" ? data.googleMapsUrl : undefined,
    imageUrl: data?.imageUrl ?? "",
    galleryImages: readPhotos(data),
    mapIconUrl: data?.mapIconUrl ?? "",
    mapIconPath: data?.mapIconPath ?? "",
    comment: data?.comment ?? "",
    theVibe: data?.theVibe ?? "",
    theSelection: data?.theSelection ?? "",
    theExperience: data?.theExperience ?? "",
    businessHours: data?.businessHours ?? null,
    lat: typeof data?.lat === "number" ? data.lat : Number(data?.lat ?? 0),
    lng: typeof data?.lng === "number" ? data.lng : Number(data?.lng ?? 0),
    ratingAverage: typeof data?.ratingAverage === "number" ? data.ratingAverage : 0,
    ratingCount: typeof data?.ratingCount === "number" ? data.ratingCount : 0,
    favoriteCount: typeof data?.favoriteCount === "number" ? data.favoriteCount : 0,
    routeClickCount: typeof data?.routeClickCount === "number" ? data.routeClickCount : 0,
  };
}

/* ===== CRUD（既存踏襲） ===== */

export async function getShops(): Promise<ShopDoc[]> {
  const snap = await getDocs(SHOPS_QUERY);
  return snap.docs.map((d) => mapShop(d.id, d.data()));
}

export async function getShopById(id: string): Promise<ShopDoc | null> {
  if (!id) return null;
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapShop(snap.id, snap.data());
}

export async function addShop(
  input: Omit<ShopDoc, "id">,
  imageUri?: string | null,
  icon?: IconChange,
  gallery?: DraftPhoto[]
): Promise<string> {
  const mapsField = googleMapsUrlField(input.googleMapsUrl);
  const hoursError = validateBusinessHours(input.businessHours);
  if (hoursError) throw new Error(hoursError);
  const shopRef = doc(collection(db, COL));
  const imageUrl = imageUri
    ? await uploadImage(imageUri, `shops/${shopRef.id}/cover`)
    : undefined;

  let prepared: Awaited<ReturnType<typeof preparePhotos>> | undefined;
  let uploaded: Awaited<ReturnType<typeof uploadMapIcon>> | null = null;
  try {
  if (gallery) prepared = await preparePhotos(shopPhotoPrefix(shopRef.id), gallery, 10);
  uploaded = icon ? await uploadMapIcon(shopRef.id, icon.uri) : null;
  await setDoc(shopRef, {
    ...(uploaded ?? {}),
    ...input,
    ...mapsField,
    ...(prepared ? { galleryImages: prepared.images } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  } catch (error) {
    const cleanup = await Promise.allSettled([...(prepared ? [prepared.rollback()] : []), ...(uploaded ? [deleteMapIcon(uploaded.mapIconPath, shopRef.id)] : [])]);
    if (cleanup.some(r => r.status === "rejected")) throw new Error("店舗保存失敗。Storage画像の削除に再試行が必要です");
    throw error;
  }
  return shopRef.id;
}

export async function updateShop(
  id: string,
  patch: Partial<Omit<ShopDoc, "id">>,
  icon?: IconChange,
  gallery?: DraftPhoto[]
): Promise<{ cleanupFailed: boolean }> {
  if (!id) throw new Error("updateShop: id is empty");
  const mapsField = googleMapsUrlField(patch.googleMapsUrl);
  const hoursError = validateBusinessHours(patch.businessHours);
  if (hoursError) throw new Error(hoursError);
  const ref = doc(db, COL, id);
  const previous = icon !== undefined || gallery !== undefined ? await getShopById(id) : null;
  let prepared: Awaited<ReturnType<typeof preparePhotos>> | undefined;
  let uploaded: Awaited<ReturnType<typeof uploadMapIcon>> | null = null;
  try {
    if (gallery) prepared = await preparePhotos(shopPhotoPrefix(id), gallery, 10);
    uploaded = icon ? await uploadMapIcon(id, icon.uri) : null;
    await updateDoc(ref, { ...patch, ...mapsField, ...(prepared ? { galleryImages: prepared.images } : {}), ...(uploaded ?? (icon === null ? { mapIconUrl: "", mapIconPath: "" } : {})), updatedAt: serverTimestamp() });
  } catch (error) {
    const cleanup = await Promise.allSettled([...(prepared ? [prepared.rollback()] : []), ...(uploaded ? [deleteMapIcon(uploaded.mapIconPath, id)] : [])]);
    if (cleanup.some(r => r.status === "rejected")) throw new Error("更新失敗。Storage画像の削除に再試行が必要です");
    throw error;
  }
  let cleanupFailed = false;
  if (prepared && previous?.galleryImages) try { await deletePhotos(shopPhotoPrefix(id), previous.galleryImages.filter(i => i.storagePath.startsWith(shopPhotoPrefix(id)) && !prepared!.images.some(next => next.storagePath === i.storagePath))); } catch { cleanupFailed = true; }
  // Commit first: never remove the currently referenced icon on save failure.
  if (icon !== undefined && previous?.mapIconPath) {
    try { await deleteMapIcon(previous.mapIconPath, id); }
    catch { console.warn("[map-icon] Saved successfully; old icon cleanup requires retry", previous.mapIconPath); }
  }
  return { cleanupFailed };
}

export async function removeShop(id: string): Promise<void> {
  if (!id) throw new Error("removeShop: id is empty");
  const ref = doc(db, COL, id);
  await deleteDoc(ref);
}

/* ===== 一覧 Hook（ここが核心） ===== */

export function useShops() {
  const [shops, setShops] = useState<ShopDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unsubRef = useRef<null | (() => void)>(null);

  // 🔁 手動更新（更新ボタン用）
  const refresh = useCallback(async () => {
    try {
      setError("");
      const snap = await getDocs(SHOPS_QUERY);
      const next = snap.docs.map((d) => mapShop(d.id, d.data()));
      setShops(next); // ← 新しい参照で必ず再描画
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }, []);

  // 🔥 リアルタイム購読（最重要）
  useEffect(() => {
    setLoading(true);

    unsubRef.current?.();
    unsubRef.current = onSnapshot(
      SHOPS_QUERY,
      (snap) => {
        const next = snap.docs.map((d) => mapShop(d.id, d.data()));
        setShops(next);
        setLoading(false);
      },
      (err) => {
        console.error("[useShops] snapshot error", err);
        setError(String(err.message ?? err));
        setLoading(false);
      }
    );

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  return { shops, loading, error, refresh };
}

/* ===== 単体取得 Hook（既存踏襲） ===== */

export function useShopById(id?: string) {
  const [shop, setShop] = useState<ShopDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");
        setLoading(true);

        if (!id) {
          if (alive) setShop(null);
          return;
        }

        const s = await getShopById(String(id));
        if (alive) setShop(s);
      } catch (e: any) {
        if (alive) setError(String(e?.message ?? e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  return { shop, loading, error };
}
