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

  /** ✅ UIから呼ぶ削除 */
  const deleteReview = useCallback(
    async (reviewId: string) => {
      await removeReview(shopId, reviewId);
      // A：確実に反映
      await reload();
    },
    [shopId, reload]
  );

  return { reviews, loading, error, reload, deleteReview };
}
