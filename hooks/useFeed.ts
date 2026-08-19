// hooks/useFeed.ts
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { db, isFirebaseConfigured } from "../lib/firebase";

export type FeedMessage = {
  id: string;
  authorName: string;
  text: string;
  timestamp: number; // Unix timestamp in milliseconds
  createdAt?: Timestamp | null;
};

// Dummy data for when Firebase is not available
const DUMMY_MESSAGES: FeedMessage[] = [
  {
    id: "dummy-1",
    authorName: "運営チーム",
    text: "新規ショップ「FAKE TOKYO」が渋谷エリアに追加されました！モード古着を探している方はぜひチェックしてみてください。",
    timestamp: Date.now() - 3600000,
  },
  {
    id: "dummy-2",
    authorName: "スタッフ",
    text: "週末は表参道エリアの店舗が混雑する傾向があります。平日の訪問がおすすめです。",
    timestamp: Date.now() - 7200000,
  },
  {
    id: "dummy-3",
    authorName: "運営チーム",
    text: "中目黒エリアに新しいセレクトショップがオープン予定です。詳細は後日お知らせします。",
    timestamp: Date.now() - 86400000,
  },
  {
    id: "dummy-4",
    authorName: "お知らせ",
    text: "アプリの使い方：地図タブでショップをタップすると詳細情報が表示されます。検索機能も活用してください。",
    timestamp: Date.now() - 172800000,
  },
  {
    id: "dummy-5",
    authorName: "運営チーム",
    text: "下北沢エリアの古着店が人気です。ブランド古着をお探しの方はぜひ訪問してみてください。",
    timestamp: Date.now() - 259200000,
  },
  {
    id: "dummy-6",
    authorName: "スタッフ",
    text: "銀座エリアのショップではハイブランドのアイテムが充実しています。",
    timestamp: Date.now() - 345600000,
  },
  {
    id: "dummy-7",
    authorName: "お知らせ",
    text: "レビュー機能が追加されました。訪問したショップの感想をぜひシェアしてください。",
    timestamp: Date.now() - 432000000,
  },
  {
    id: "dummy-8",
    authorName: "運営チーム",
    text: "原宿エリアのストリートファッションショップが更新されました。",
    timestamp: Date.now() - 518400000,
  },
];

function mapFirestoreMessage(id: string, data: any): FeedMessage {
  const timestamp = data?.createdAt?.toMillis?.() ?? data?.timestamp ?? Date.now();
  return {
    id,
    authorName: data?.authorName ?? data?.author ?? "URBN staff",
    text: data?.text ?? data?.message ?? "",
    timestamp,
    createdAt: data?.createdAt ?? null,
  };
}

export function useFeed() {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    // If Firebase is not configured, use dummy data immediately
    if (!isFirebaseConfigured || !db) {
      console.warn("📡 useFeed: Firebase not configured, using dummy data");
      setMessages(DUMMY_MESSAGES);
      setUsingFallback(true);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const q = query(collection(db, "feed"), orderBy("createdAt", "asc"));

      unsubRef.current?.();
      unsubRef.current = onSnapshot(
        q,
        (snap: any) => {
          if (snap.empty) {
            setMessages([]);
            setUsingFallback(false);
          } else {
            const msgs = snap.docs.map((doc: any) =>
              mapFirestoreMessage(doc.id, doc.data())
            );
            setMessages(msgs);
            setUsingFallback(false);
          }
          setLoading(false);
          setError("");
        },
        (err: any) => {
          console.error("[useFeed] Firestore error:", err);
          console.warn("📡 useFeed: Firestore error, falling back to dummy data");
          setMessages(DUMMY_MESSAGES);
          setUsingFallback(true);
          setError(String(err.message ?? err));
          setLoading(false);
        }
      );

      return () => {
        unsubRef.current?.();
        unsubRef.current = null;
      };
    } catch (e: any) {
      console.error("[useFeed] Setup error:", e);
      console.warn("📡 useFeed: Setup error, using dummy data");
      setMessages(DUMMY_MESSAGES);
      setUsingFallback(true);
      setError(String(e?.message ?? e));
      setLoading(false);
    }
  }, []);

  const sendMessage = async (input: { text: string; authorName?: string }) => {
    if (!isFirebaseConfigured || !db) {
      return { ok: false, error: "Firebase not configured" } as const;
    }

    const text = (input.text ?? "").trim();
    if (!text) return { ok: false, error: "empty" } as const;
    if (text.length > 500) return { ok: false, error: "too_long" } as const;

    try {
      await addDoc(collection(db, "feed"), {
        text,
        authorName: input.authorName?.trim() || "URBN staff",
        createdAt: serverTimestamp(),
      });
      return { ok: true } as const;
    } catch (e: any) {
      return { ok: false, error: String(e?.message ?? e) } as const;
    }
  };

  return {
    messages,
    loading,
    error,
    usingFallback,
    isConfigured: isFirebaseConfigured && !!db,
    sendMessage,
  };
}
