// types/review.ts
import type { Timestamp } from "firebase/firestore";

export type ReviewDoc = {
  id: string;
  rating: number;      // 1..5
  text?: string;
  createdAt?: Timestamp | null;
};
