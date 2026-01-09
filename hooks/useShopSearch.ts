// hooks/useShopSearch.ts
import { useMemo } from "react";

export type ShopLike = {
  id: string;
  name?: string;
  area?: string;
  genre?: string;
  brands?: string[] | string;
  lat?: number;
  lng?: number;
};

function normalize(s: unknown) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toBrandsArray(brands: unknown): string[] {
  if (Array.isArray(brands)) return brands.map((b) => String(b));
  if (typeof brands === "string") return brands.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export function useShopSearch<T extends ShopLike>(shops: T[] | undefined, query: string) {
  const q = normalize(query);

  const filtered = useMemo(() => {
    const list = Array.isArray(shops) ? shops : [];
    if (!q) return list;

    return list.filter((s) => {
      const hay = [
        s.name,
        s.area,
        s.genre,
        ...toBrandsArray(s.brands),
      ]
        .map(normalize)
        .join(" ");

      return hay.includes(q);
    });
  }, [shops, q]);

  return {
    query: q,
    filtered,
    total: Array.isArray(shops) ? shops.length : 0,
    count: filtered.length,
  };
}
