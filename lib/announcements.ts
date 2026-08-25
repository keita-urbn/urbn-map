import {
  Timestamp,
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  doc,
  where,
} from "firebase/firestore";

import type { Announcement, AnnouncementCategory } from "../types/announcement";
import { ANNOUNCEMENT_CATEGORIES } from "../types/announcement";
import { db } from "./firebase";

function isCategory(value: unknown): value is AnnouncementCategory {
  return ANNOUNCEMENT_CATEGORIES.includes(value as AnnouncementCategory);
}

function mapAnnouncement(id: string, data: any): Announcement {
  return {
    id,
    category: isCategory(data?.category) ? data.category : "OTHER",
    title: typeof data?.title === "string" ? data.title : "",
    description: typeof data?.description === "string" ? data.description : "",
    publishedAt: data?.publishedAt?.toMillis?.() ?? 0,
    createdAt: data?.createdAt?.toMillis?.() ?? 0,
    createdBy: typeof data?.createdBy === "string" ? data.createdBy : "",
  };
}

export function subscribePublishedAnnouncements(
  onData: (items: Announcement[]) => void,
  onError: (error: Error) => void,
) {
  const publishedQuery = query(
    collection(db, "announcements"),
    where("publishedAt", "<=", Timestamp.now()),
    orderBy("publishedAt", "desc"),
  );
  return onSnapshot(
    publishedQuery,
    (snapshot) => onData(snapshot.docs.map((item) => mapAnnouncement(item.id, item.data()))),
    (error) => onError(error),
  );
}

export function subscribeAnnouncementReads(
  uid: string,
  onData: (ids: Set<string>) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    collection(db, "users", uid, "announcementReads"),
    (snapshot) => onData(new Set(snapshot.docs.map((item) => item.id))),
    (error) => onError(error),
  );
}

export async function markAnnouncementRead(uid: string, announcementId: string) {
  await setDoc(
    doc(db, "users", uid, "announcementReads", announcementId),
    { announcementId, readAt: serverTimestamp() },
    { merge: true },
  );
}

export async function createAnnouncement(input: {
  category: AnnouncementCategory;
  title: string;
  description: string;
  publishedAt: Date;
  createdBy: string;
}) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || !description) throw new Error("required_fields");

  return addDoc(collection(db, "announcements"), {
    category: input.category,
    title,
    description,
    publishedAt: Timestamp.fromDate(input.publishedAt),
    createdAt: serverTimestamp(),
    createdBy: input.createdBy,
  });
}
