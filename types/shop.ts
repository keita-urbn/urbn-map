// types/shop.ts
export type ShopDoc = {
  id: string;
  name: string;

  // map
  lat: number;
  lng: number;

  // optional meta
  area?: string;
  genre?: string;
  address?: string;
  brands?: string; // comma separated string (簡単運用)
  instagram?: string;
  comment?: string;

  // image
  imageUrl?: string;

  // timestamps
  createdAt?: number;
  updatedAt?: number;
};
