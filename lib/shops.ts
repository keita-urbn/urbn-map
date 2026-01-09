// lib/shops.ts
export type Shop = {
  id: number | string;
  name: string;

  // フラットで持つ（edit/add がこれを前提）
  area: string;
  genre: string;

  address?: string;
  brands?: string;      // "CELINE, YSL" みたいな文字列でOK
  instagram?: string;
  imageUrl?: string;
  comment?: string;

  lat: number;
  lng: number;

  // 既存UIが meta を使ってても壊れないよう残す（互換用）
  meta?: { area: string; genre: string };
};

const shopCoordsBase: Shop[] = [
  { id: 1,  name: "I&I Store",              area: "中目黒", genre: "古着",         meta: { area: "中目黒", genre: "古着" },         lat: 35.642, lng: 139.698 },
  { id: 2,  name: "FAKE TOKYO",             area: "渋谷",   genre: "モード古着",   meta: { area: "渋谷",   genre: "モード古着" },   lat: 35.659, lng: 139.700 },
  { id: 3,  name: "BRIDGE",                 area: "代官山", genre: "ブランド古着", meta: { area: "代官山", genre: "ブランド古着" }, lat: 35.658, lng: 139.701 },
  { id: 4,  name: "Little Trip to Heaven",  area: "下北沢", genre: "ブランド古着", meta: { area: "下北沢", genre: "ブランド古着" }, lat: 35.661, lng: 139.668 },
  { id: 5,  name: "Sanself Tokyo",          area: "表参道", genre: "セレクト",     meta: { area: "表参道", genre: "セレクト" },     lat: 35.665, lng: 139.710 },
  { id: 6,  name: "ALLU Tokyo",             area: "銀座",   genre: "ブランド古着", meta: { area: "銀座",   genre: "ブランド古着" }, lat: 35.670, lng: 139.765 },
  { id: 7,  name: "Pass the Baton",         area: "丸の内", genre: "リユース",     meta: { area: "丸の内", genre: "リユース" },     lat: 35.680, lng: 139.764 },
  { id: 8,  name: "ethos",                  area: "渋谷",   genre: "モード",       meta: { area: "渋谷",   genre: "モード" },       lat: 35.659, lng: 139.702 },
  { id: 9,  name: "HER",                    area: "原宿",   genre: "レディースモード", meta: { area: "原宿", genre: "レディースモード" }, lat: 35.670, lng: 139.705 },
  { id: 10, name: "ORPHIC",                 area: "青山",   genre: "スニーカー",   meta: { area: "青山",   genre: "スニーカー" },   lat: 35.664, lng: 139.713 },
  { id: 11, name: "IENA Maison",            area: "表参道", genre: "セレクト",     meta: { area: "表参道", genre: "セレクト" },     lat: 35.666, lng: 139.709 },
  { id: 12, name: "EDITION",                area: "六本木", genre: "モード",       meta: { area: "六本木", genre: "モード" },       lat: 35.663, lng: 139.717 },
  { id: 13, name: "RAGTAG 渋谷店",          area: "渋谷",   genre: "リユース",     meta: { area: "渋谷",   genre: "リユース" },     lat: 35.669, lng: 139.705 },
  { id: 14, name: "KNIT KINT",              area: "青山",   genre: "モード古着",   meta: { area: "青山",   genre: "モード古着" },   lat: 35.658, lng: 139.700 },
  { id: 15, name: "STUDIOUS",               area: "渋谷",   genre: "セレクト",     meta: { area: "渋谷",   genre: "セレクト" },     lat: 35.659, lng: 139.700 },
  { id: 16, name: "N.HOLLYWOOD",            area: "原宿",   genre: "デザイナーズ", meta: { area: "原宿",   genre: "デザイナーズ" }, lat: 35.662, lng: 139.718 },
  { id: 17, name: "AURALEE",                area: "表参道", genre: "デザイナーズ", meta: { area: "表参道", genre: "デザイナーズ" }, lat: 35.663, lng: 139.725 },
  { id: 18, name: "BIOTOP",                 area: "白金台", genre: "モード",       meta: { area: "白金台", genre: "モード" },       lat: 35.642, lng: 139.714 },
  { id: 19, name: "L’ECHOPPE",              area: "青山",   genre: "セレクト",     meta: { area: "青山",   genre: "セレクト" },     lat: 35.662, lng: 139.714 },
  { id: 20, name: "JUMBLE STORE",           area: "下北沢", genre: "古着",         meta: { area: "下北沢", genre: "古着" },         lat: 35.662, lng: 139.667 },
  { id: 21, name: "BIG TIME",               area: "下北沢", genre: "古着",         meta: { area: "下北沢", genre: "古着" },         lat: 35.706, lng: 139.650 },
  { id: 22, name: "GRAPE",                  area: "中目黒", genre: "ストリート",   meta: { area: "中目黒", genre: "ストリート" },   lat: 35.667, lng: 139.706 },
  { id: 23, name: "CANNABIS",               area: "原宿",   genre: "モード",       meta: { area: "原宿",   genre: "モード" },       lat: 35.667, lng: 139.706 },
  { id: 24, name: "SO_NK",                  area: "表参道", genre: "セレクト",     meta: { area: "表参道", genre: "セレクト" },     lat: 35.662, lng: 139.715 },
  { id: 25, name: "jackpot",                area: "新宿",   genre: "セレクト",     meta: { area: "新宿",   genre: "セレクト" },     lat: 35.693, lng: 139.703 },
];

export default shopCoordsBase;

export async function getShops(): Promise<Shop[]> {
  return shopCoordsBase;
}

export async function getShop(id: string | number): Promise<Shop | null> {
  const wanted = String(id ?? "").trim();
  return shopCoordsBase.find((s) => String(s.id) === wanted) ?? null;
}
