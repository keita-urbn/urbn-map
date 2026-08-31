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

  // aggregated review stats
  ratingAverage?: number;
  ratingCount?: number;

  // ranking aggregates (maintained by favorite / route actions)
  favoriteCount?: number;
  routeClickCount?: number;

  // timestamps
  createdAt?: number;
  updatedAt?: number;
};
