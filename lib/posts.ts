import { removeArticle, saveArticle } from "./articlePersistence";
import { mapInfoArticle } from "./infoArticles";
// lib/posts.ts
import {
    collection,
    doc,
    getDocs,
    getDoc,
    orderBy,
    query,
} from "firebase/firestore";

import type { PostDoc } from "../types/post";
import { db } from "./firebase";

const COL = "posts";

/** Parse comma-separated hashtag string → clean string[] */
export function parseHashtags(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean)
    .map((t) => `#${t}`);
}

/** Firestore doc → PostDoc */
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

/** Add a new post */
export async function addPost(
  input: Omit<PostDoc, "id" | "createdAt">
): Promise<string> {
  const result = await saveArticle({ source: COL, title: input.title, hashtags: input.hashtags,
    abstract: input.abstract, body: input.body, kind: 'shop', publicBlocks: [],
    bodyBlocks: input.body ? [{ id: 'body', type: 'text', text: input.body }] : [],
    images: [], previousImages: [] });
  return result.id;
}

/** Get all posts ordered by newest first */
export async function getPosts(): Promise<PostDoc[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapPost(d.id, d.data()));
}

/** Delete a post by ID */
export async function deletePost(id: string): Promise<void> {
  if (!id) throw new Error("deletePost: id is empty");
  const snapshot = await getDoc(doc(db, COL, id));
  const cleanupFailed = await removeArticle(COL, id, mapInfoArticle(id, COL, snapshot.data() ?? {}, false).publicImages);
  if (cleanupFailed) throw new Error("記事は削除されましたが、Storage画像の削除を確認してください");
}
