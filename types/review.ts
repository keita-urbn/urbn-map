// types/review.ts
import type { Timestamp } from "firebase/firestore";

export type ReviewDoc = {
  id: string;
  images?: import("../lib/photoGallery").Photo[];
  displayName?: string;
  photoURL?: string;
  rating: number;      // 1..5
  text?: string;
  userId?: string | null;
  createdAt?: Timestamp | null;
};
