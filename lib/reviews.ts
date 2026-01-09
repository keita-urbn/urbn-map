// lib/reviews.ts
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
} from "firebase/firestore";
import type { ReviewDoc } from "../types/review";
import { db } from "./firebase";

// shops/{shopId}/reviews
function reviewsCol(shopId: string) {
  return collection(db, "shops", shopId, "reviews");
}

export async function getReviews(shopId: string): Promise<ReviewDoc[]> {
  const q = query(reviewsCol(shopId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    shopId,
    rating: d.data()?.rating ?? 5,
    text: d.data()?.text ?? "",
    createdAt: d.data()?.createdAt ?? null,
  }));
}

export async function addReview(shopId: string, input: { rating: number; text: string }) {
  if (!shopId) throw new Error("addReview: shopId is empty");
  const ref = await addDoc(reviewsCol(shopId), {
    rating: input.rating,
    text: input.text,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** ✅ 削除：shops/{shopId}/reviews/{reviewId} */
export async function removeReview(shopId: string, reviewId: string) {
  if (!shopId) throw new Error("removeReview: shopId is empty");
  if (!reviewId) throw new Error("removeReview: reviewId is empty");
  await deleteDoc(doc(db, "shops", shopId, "reviews", reviewId));
}
