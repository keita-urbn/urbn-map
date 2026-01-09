// hooks/useShops.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

import { db } from "../lib/firebase";
import type { ShopDoc } from "../types/shop";

const COL = "shops";

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
    imageUrl: data?.imageUrl ?? "",
    comment: data?.comment ?? "",
    lat: typeof data?.lat === "number" ? data.lat : Number(data?.lat ?? 0),
    lng: typeof data?.lng === "number" ? data.lng : Number(data?.lng ?? 0),
  };
}

/* ===== CRUD（既存踏襲） ===== */

export async function getShops(): Promise<ShopDoc[]> {
  const q = query(collection(db, COL), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapShop(d.id, d.data()));
}

export async function getShopById(id: string): Promise<ShopDoc | null> {
  if (!id) return null;
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapShop(snap.id, snap.data());
}

export async function addShop(input: Omit<ShopDoc, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateShop(
  id: string,
  patch: Partial<Omit<ShopDoc, "id">>
): Promise<void> {
  if (!id) throw new Error("updateShop: id is empty");
  const ref = doc(db, COL, id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
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

  const q = query(collection(db, COL), orderBy("name", "asc"));

  // 🔁 手動更新（更新ボタン用）
  const refresh = useCallback(async () => {
    try {
      setError("");
      const snap = await getDocs(q);
      const next = snap.docs.map((d) => mapShop(d.id, d.data()));
      setShops(next); // ← 新しい参照で必ず再描画
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }, [q]);

  // 🔥 リアルタイム購読（最重要）
  useEffect(() => {
    setLoading(true);

    unsubRef.current?.();
    unsubRef.current = onSnapshot(
      q,
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
  }, [q]);

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
