import { useCallback, useEffect, useRef, useState } from "react";
import { getReviews, removeReview } from "../lib/reviews";
import type { ReviewDoc } from "../types/review";

type ReviewState = { shopId: string; reviews: ReviewDoc[]; loading: boolean; error: string };

export function useReviews(shopId: string) {
  const [state, setState] = useState<ReviewState | null>(null);
  const request = useRef(0);
  const activeScope = useRef<{ shopId: string } | null>(null);

  const load = useCallback(async () => {
    const id = ++request.current;
    try {
      const reviews = await getReviews(shopId);
      if (id === request.current) setState({ shopId, reviews, loading: false, error: "" });
    } catch (error) {
      if (id !== request.current) return;
      setState((previous) => ({
        shopId,
        reviews: previous?.shopId === shopId ? previous.reviews : [],
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    activeScope.current = { shopId };
    void load();
    return () => {
      activeScope.current = null;
      request.current += 1;
    };
  }, [load, shopId]);

  const reload = useCallback(() => {
    if (activeScope.current?.shopId !== shopId) return Promise.resolve();
    setState((previous) => ({
      shopId, reviews: previous?.shopId === shopId ? previous.reviews : [], loading: true, error: "",
    }));
    return load();
  }, [load, shopId]);

  const deleteReview = useCallback(async (reviewId: string) => {
    const scope = activeScope.current;
    if (!reviewId || scope?.shopId !== shopId) return;
    const result = await removeReview(shopId, reviewId);
    if (scope === activeScope.current) await reload();
    return result;
  }, [shopId, reload]);

  const current = state?.shopId === shopId ? state : null;
  return {
    reviews: current?.reviews ?? [],
    loading: current?.loading ?? !!shopId,
    error: current?.error ?? "",
    reload,
    deleteReview,
  };
}
