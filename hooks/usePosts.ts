// hooks/usePosts.ts
import {
    collection,
    onSnapshot,
    orderBy,
    query,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

import { db } from "../lib/firebase";
import type { PostDoc } from "../types/post";

const COL = "posts";

function mapPost(id: string, data: any): PostDoc {
  return {
    id,
    title: data?.title ?? "",
    hashtags: Array.isArray(data?.hashtags) ? data.hashtags : [],
    abstract: data?.abstract ?? "",
    body: data?.body ?? "",
    createdAt: data?.createdAt?.toMillis?.() ?? Date.now(),
    authorRole: "admin",
  };
}

export function usePosts() {
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const unsubRef = useRef<null | (() => void)>(null);

  const q = query(collection(db, COL), orderBy("createdAt", "desc"));

  const refresh = useCallback(async () => {
    try {
      setError("");
      const { getDocs } = await import("firebase/firestore");
      const snap = await getDocs(q);
      const next = snap.docs.map((d) => mapPost(d.id, d.data()));
      setPosts(next);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }, [q]);

  useEffect(() => {
    setLoading(true);
    unsubRef.current?.();

    unsubRef.current = onSnapshot(
      q,
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

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  return { posts, loading, error, refresh };
}
