// lib/posts.ts
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
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
    body: data?.body ?? "",
    createdAt: data?.createdAt?.toMillis?.() ?? Date.now(),
    authorRole: "admin",
  };
}

/** Add a new post */
export async function addPost(
  input: Omit<PostDoc, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    title: input.title,
    hashtags: input.hashtags,
    abstract: input.abstract,
    body: input.body,
    authorRole: "admin",
    createdAt: serverTimestamp(),
  });
  return ref.id;
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
  await deleteDoc(doc(db, COL, id));
}
