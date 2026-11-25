import { mapInfoArticle } from "../lib/infoArticles";
// hooks/usePosts.ts
import {
    collection,
    getDocs,
    onSnapshot,
    orderBy,
    query,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

import { db } from "../lib/firebase";
import type { PostDoc } from "../types/post";

const COL = "posts";
const POSTS_QUERY = db ? query(collection(db, COL), orderBy("createdAt", "desc")) : null;

function mapPost(id: string, data: any): PostDoc {
  return {
    id,
    title: data?.title ?? "",
    hashtags: Array.isArray(data?.hashtags) ? data.hashtags : [],
    abstract: data?.abstract ?? "",
    body: "",
    article: mapInfoArticle(id, "posts", data, false),
    createdAt: data?.createdAt?.toMillis?.() ?? Date.now(),
    authorRole: "admin",
  };
}

export function usePosts() {
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loading, setLoading] = useState(!!POSTS_QUERY);
  const [error, setError] = useState(POSTS_QUERY ? "" : "Firebase未設定");

  const refresh = useCallback(async () => {
    if (!POSTS_QUERY) return;
    try {
      setError("");
      const snap = await getDocs(POSTS_QUERY);
      const next = snap.docs.map((d) => mapPost(d.id, d.data()));
      setPosts(next);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }, []);

  useEffect(() => {
    if (!POSTS_QUERY) return;
    return onSnapshot(
      POSTS_QUERY,
      (snap) => {
        const next = snap.docs.map((d) => mapPost(d.id, d.data()));
        setPosts(next);
        setLoading(false);
      },
      (err) => {
        console.error("[usePosts] snapshot error", err);
        setError(String(err.message ?? err));
        setLoading(false);
      },
    );
  }, []);

  return { posts, loading, error, refresh };
}
