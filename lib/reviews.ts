import { logReviewFailure, submissionError, reviewImageMetadata } from "./reviewDiagnostics";
import { readPhotos, type DraftPhoto, type Photo } from "./photoGallery";
import { preparePhotos, deletePhotos, reviewPhotoPrefix } from "./photoStorage";
// lib/reviews.ts
import {
    collection,
    doc,
    getDocs,
    getDoc,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";
import type { ReviewDoc } from "../types/review";
import { auth, db } from "./firebase";

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
    displayName: typeof d.data()?.displayName === "string" ? d.data().displayName : undefined,
    photoURL: typeof d.data()?.photoURL === "string" ? d.data().photoURL : undefined,
    text: d.data()?.text ?? "",
    images: readPhotos(d.data()),
    userId: d.data()?.userId ?? null,
    createdAt: d.data()?.createdAt ?? null,
  }));
}

/**
 * Create a review AND update the shop's aggregated rating fields
 * inside a single Firestore transaction.
 *
 * Document ID = uid → one review per user per shop.
 * The caller should pre-check existence to show a friendly banner,
 * but the transaction also guards against races.
 */
export async function addReview(
  shopId: string,
  input: { rating: number; text: string; images?: DraftPhoto[] },
) {
  if (!shopId) throw new Error("addReview: shopId is empty");
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5 || !input.text.trim()) throw new Error("星評価とレビュー本文を入力してください");
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("addReview: user is not logged in");

  const shopRef = doc(db, "shops", shopId);
  const reviewRef = doc(db, "shops", shopId, "reviews", uid);

  console.log("[reviews] addReview start", {
    uid,
    reviewPath: reviewRef.path,
    shopPath: shopRef.path,
  });

  const context = { shopId, reviewId: uid, uid, reviewPath: reviewRef.path };
  const prefix = reviewPhotoPrefix(shopId, uid);
  let stage = "review-preflight";
  let prepared: Awaited<ReturnType<typeof preparePhotos>> | undefined;
  try {
  if ((await getDoc(reviewRef)).exists()) throw new Error("ALREADY_REVIEWED");
  stage = "review-images";
  prepared = await preparePhotos(prefix, input.images ?? [], 5);
  stage = "review-payload";
  const images = reviewImageMetadata(prepared.images, prefix);
  stage = "firestore-transaction";
  await runTransaction(db, async (tx) => {
    const shopSnap = await tx.get(shopRef);
    const reviewSnap = await tx.get(reviewRef);

    if (reviewSnap.exists()) {
      throw new Error("ALREADY_REVIEWED");
    }

    const oldAvg = shopSnap.data()?.ratingAverage ?? 0;
    const oldCount = shopSnap.data()?.ratingCount ?? 0;
    const newCount = oldCount + 1;
    const newAvg = (oldAvg * oldCount + input.rating) / newCount;

    const reviewPayload = {
      ...(images.length ? { images } : {}),
      rating: input.rating,
      text: input.text,
      userId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // ONLY ratingAverage + ratingCount — no updatedAt
    // (normal users are not allowed to write other shop fields)
    const shopAggPayload = {
      ratingAverage: newAvg,
      ratingCount: newCount,
    };

    console.log("[reviews] tx payloads", {
      reviewKeys: Object.keys(reviewPayload),
      shopKeys: Object.keys(shopAggPayload),
    });

    tx.set(reviewRef, reviewPayload);
    tx.update(shopRef, shopAggPayload);
  });

  } catch (error) {
    logReviewFailure(stage, error, context);
    if (prepared) try { await prepared.rollback(); } catch (cleanupError) { logReviewFailure("transaction-rollback", cleanupError, { ...context, uploadedPaths: prepared.images.map(i => i.storagePath) }); }
    throw submissionError(error);
  }
  console.log("[reviews] wrote review (transaction)", { shopId, uid });
  return uid;
}

/**
 * Delete a review AND update the shop's aggregated rating fields
 * inside a single Firestore transaction.
 */
export async function removeReview(shopId: string, reviewId: string) {
  if (!shopId) throw new Error("removeReview: shopId is empty");
  if (!reviewId) throw new Error("removeReview: reviewId is empty");

  const uid = auth.currentUser?.uid;
  if (!uid || uid !== reviewId && (await getDoc(doc(db, "users", uid))).data()?.role !== "admin") throw new Error("レビュー削除権限がありません");
  const shopRef = doc(db, "shops", shopId);
  const reviewRef = doc(db, "shops", shopId, "reviews", reviewId);

  const removed = await runTransaction(db, async (tx) => {
    const shopSnap = await tx.get(shopRef);
    const reviewSnap = await tx.get(reviewRef);

    if (!reviewSnap.exists()) {
      // Already deleted — nothing to do
      return [] as Photo[];
    }

    const reviewRating = reviewSnap.data()?.rating ?? 0;
    const oldAvg = shopSnap.data()?.ratingAverage ?? 0;
    const oldCount = shopSnap.data()?.ratingCount ?? 0;
    const newCount = Math.max(0, oldCount - 1);
    const newAvg = newCount === 0 ? 0 : (oldAvg * oldCount - reviewRating) / newCount;

    // Delete the review doc
    tx.delete(reviewRef);

    // ONLY ratingAverage + ratingCount — no updatedAt
    tx.update(shopRef, {
      ratingAverage: newAvg,
      ratingCount: newCount,
    });
    return readPhotos(reviewSnap.data());
  });
  let cleanupFailed = false;
  try { await deletePhotos(reviewPhotoPrefix(shopId, reviewId), removed.filter(image => image.storagePath.startsWith(reviewPhotoPrefix(shopId, reviewId)))); } catch { cleanupFailed = true; }

  console.log("[reviews] deleted review (transaction)", { shopId, reviewId });
  return { cleanupFailed };
}
