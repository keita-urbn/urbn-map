// hooks/useAnnouncements.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, isFirebaseConfigured } from "../lib/firebase";

// ── Unified announcement type ─────────────────────────────────────────────────
export type AnnouncementMessage = {
  id: string;
  kind: "shop" | "event" | "size" | "trend";
  title: string;
  hashtags: string[];
  abstract: string;
  body: string;
  authorName?: string;
  createdAt: number;
};

// ── Parse hashtag string → clean "#tag" array ─────────────────────────────────
export function parseHashtags(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,\s]+/)
    .map((t) => t.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((t) => `#${t}`);
}

// ── Firestore doc → AnnouncementMessage ──────────────────────────────────────
function mapDoc(id: string, data: any): AnnouncementMessage {
  return {
    id,
    kind: data.kind ?? "shop",
    title: data.title ?? "",
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
    abstract: data.abstract ?? "",
    body: data.body ?? "",
    authorName: data.authorName ?? "admin",
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const DUMMY_POSTS: AnnouncementMessage[] = [
  {
    id: "dummy-1",
    kind: "shop",
    title: "表参道エリア最新情報",
    hashtags: ["#表参道", "#selectshop"],
    abstract: "今週の表参道周辺ショップ最新情報をお届けします。",
    body: "アウラリー、ルシャップをはじめとしたデザイナーズショップが今週末セールを実施。詳細は各店舗へお問い合わせください。",
    authorName: "admin",
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    id: "dummy-2",
    kind: "event",
    title: "週末イベント速報",
    hashtags: ["#下北沢", "#古着"],
    abstract: "下北沢エリアにて古着マーケットが開催されます。",
    body: "今週末、下北沢駅前広場にて古着マーケットが開催されます。50店舗以上が出店予定です。入場無料、10時～18時。",
    authorName: "admin",
    createdAt: Date.now() - 1000 * 60 * 60 * 28,
  },
];

// ── Match helper (deduplicate optimistic updates) ─────────────────────────────
function isMatch(pending: AnnouncementMessage, remote: AnnouncementMessage) {
  if (pending.title !== remote.title) return false;
  return Math.abs(remote.createdAt - pending.createdAt) < 1000 * 60 * 10;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAnnouncements(collectionName: string = "chat") {
  const [announcements, setAnnouncements] = useState<AnnouncementMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [sendError, setSendError] = useState("");

  const pendingRef = useRef<AnnouncementMessage[]>([]);
  const remoteRef = useRef<AnnouncementMessage[]>([]);

  const isConfigured = isFirebaseConfigured && !!db;

  const merge = useCallback(() => {
    const remote = remoteRef.current;
    const pending = pendingRef.current.filter(
      (p) => !remote.some((r) => isMatch(p, r))
    );
    pendingRef.current = pending;
    const merged = [...remote, ...pending].sort(
      (a, b) => a.createdAt - b.createdAt
    );
    setAnnouncements(merged);
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setDemoMode(true);
      setAnnouncements(DUMMY_POSTS);
      setLoading(false);
      return;
    }

    setDemoMode(false);
    setLoading(true);

    const q = query(
      collection(db, collectionName),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        remoteRef.current = snap.docs.map((d) => mapDoc(d.id, d.data()));
        merge();
        setLoading(false);
      },
      (err) => {
        console.error("[useAnnouncements] Firestore error:", err);
        setDemoMode(true);
        setAnnouncements(DUMMY_POSTS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isConfigured, merge, collectionName]);

  // ── Add a new structured post ─────────────────────────────────────────────
  const addAnnouncement = useCallback(
    async (input: {
      kind: AnnouncementMessage["kind"];
      title: string;
      hashtags: string[];
      abstract: string;
      body: string;
      authorName?: string;
    }) => {
      const title = input.title.trim();
      if (!title) return { ok: false, error: "empty_title" } as const;

      const optimistic: AnnouncementMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: input.kind,
        title,
        hashtags: input.hashtags,
        abstract: input.abstract.trim(),
        body: input.body.trim(),
        authorName: input.authorName ?? "admin",
        createdAt: Date.now(),
      };

      pendingRef.current = [...pendingRef.current, optimistic];
      merge();

      if (!isConfigured) return { ok: true, demo: true } as const;

      try {
        await addDoc(collection(db, collectionName), {
          kind: optimistic.kind,
          title: optimistic.title,
          hashtags: optimistic.hashtags,
          abstract: optimistic.abstract,
          body: optimistic.body,
          authorName: optimistic.authorName,
          createdAt: serverTimestamp(),
        });
        return { ok: true } as const;
      } catch (e: any) {
        pendingRef.current = pendingRef.current.filter(
          (item) => item.id !== optimistic.id
        );
        merge();
        setSendError("送信に失敗しました");
        return { ok: false, error: String(e?.message ?? e) } as const;
      }
    },
    [isConfigured, merge, collectionName]
  );

  // ── Delete a post ─────────────────────────────────────────────────────────
  const deleteAnnouncement = useCallback(
    async (id: string) => {
      if (!isConfigured) return { ok: false, error: "not_configured" } as const;
      try {
        await deleteDoc(doc(db, collectionName, id));
        return { ok: true } as const;
      } catch (e: any) {
        return { ok: false, error: String(e?.message ?? e) } as const;
      }
    },
    [isConfigured, collectionName]
  );

  const clearSendError = useCallback(() => setSendError(""), []);

  return useMemo(
    () => ({
      announcements,
      loading,
      demoMode,
      isConfigured,
      addAnnouncement,
      deleteAnnouncement,
      sendError,
      clearSendError,
    }),
    [
      announcements,
      loading,
      demoMode,
      isConfigured,
      addAnnouncement,
      deleteAnnouncement,
      sendError,
      clearSendError,
    ]
  );
}
