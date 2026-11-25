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
import { useEffect, useState } from "react";
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
  const configured = isFirebaseConfigured && !!db;
  const [messages, setMessages] = useState<FeedMessage[]>(() => configured ? [] : DUMMY_MESSAGES);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [usingFallback, setUsingFallback] = useState(!configured);

  useEffect(() => {
    if (!configured) return;
    const devFallback = (error: unknown) => {
      console.error("[useFeed] Firestore error:", error);
      setMessages(DUMMY_MESSAGES);
      setUsingFallback(true);
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    };
    let active = true;

    try {
      const q = query(collection(db, "feed"), orderBy("createdAt", "asc"));

      return onSnapshot(
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
        devFallback,
      );
    } catch (error) {
      // Treat synchronous setup failure like an async subscription result.
      queueMicrotask(() => { if (active) devFallback(error); });
      return () => { active = false; };
    }
  }, [configured]);

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
