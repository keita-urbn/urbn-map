// hooks/useReviews.ts
import { useCallback, useEffect, useState } from "react";
import { getReviews, removeReview } from "../lib/reviews";
import type { ReviewDoc } from "../types/review";

export function useReviews(shopId: string) {
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      if (!shopId) {
        setReviews([]);
        return;
      }
      const list = await getReviews(shopId);
      setReviews(list);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    reload();
  }, [reload]);

  /**
   * Delete a review by its doc ID (== reviewer's uid).
   * Uses transactional removeReview which also updates shop aggregation.
   */
  const deleteReview = useCallback(
    async (reviewId: string) => {
      if (!reviewId) return;
      await removeReview(shopId, reviewId);
      await reload();
    },
    [shopId, reload],
  );

  return { reviews, loading, error, reload, deleteReview };
}
