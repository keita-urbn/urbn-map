import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "./auth";
import {
  markAnnouncementRead,
  subscribeAnnouncementReads,
  subscribePublishedAnnouncements,
} from "../lib/announcements";
import type { Announcement } from "../types/announcement";

const NO_READS = new Set<string>();
const GUEST_READS_KEY = "@urbn/announcementReads";

type AnnouncementsContextValue = {
  announcements: Announcement[];
  readIds: Set<string>;
  unreadCount: number;
  loading: boolean;
  error: string;
  retry: () => void;
  markRead: (announcementId: string) => Promise<void>;
};

const AnnouncementsContext = createContext<AnnouncementsContextValue | null>(null);

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const uid = user?.uid ?? null;
  const [readState, setReadState] = useState<{ uid: string | null; ids: Set<string> } | null>(null);
  const readIds = readState && readState.uid === uid ? readState.ids : NO_READS;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);
  const hasLoadedFeed = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setSubscriptionVersion((value) => value + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribePublishedAnnouncements(
      (items) => {
        setAnnouncements(items);
        setError("");
        hasLoadedFeed.current = true;
        setLoading(false);
      },
      (snapshotError) => {
        console.error("[announcements] feed error:", snapshotError);
        setError("お知らせを読み込めませんでした");
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [subscriptionVersion]);

  useEffect(() => {
    let active = true;
    if (uid) {
      const unsubscribe = subscribeAnnouncementReads(
        uid,
        (ids) => { if (active) setReadState({ uid, ids }); },
        (readError) => console.error("[announcements] reads error:", readError),
      );
      return () => {
        active = false;
        unsubscribe();
      };
    }

    AsyncStorage.getItem(GUEST_READS_KEY)
      .then((raw) => {
        if (!active) return;
        const parsed = raw ? JSON.parse(raw) : [];
        setReadState({ uid: null, ids: new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []) });
      })
      .catch((readError) => console.warn("[announcements] guest reads load error:", readError));
    return () => {
      active = false;
    };
  }, [uid]);

  const markRead = useCallback(async (announcementId: string) => {
    if (!announcementId || readIds.has(announcementId)) return;
    const previous = readIds;
    const next = new Set(previous).add(announcementId);
    setReadState({ uid, ids: next });
    try {
      if (uid) {
        await markAnnouncementRead(uid, announcementId);
      } else {
        await AsyncStorage.setItem(GUEST_READS_KEY, JSON.stringify([...next]));
      }
    } catch (markError) {
      console.error("[announcements] mark read error:", markError);
      setReadState((current) => {
        if (current?.uid !== uid) return current;
        const ids = new Set(current.ids);
        ids.delete(announcementId);
        return { uid, ids };
      });
      throw markError;
    }
  }, [readIds, uid]);

  const retry = useCallback(() => {
    if (!hasLoadedFeed.current) setLoading(true);
    setError("");
    setSubscriptionVersion((version) => version + 1);
  }, []);

  const value = useMemo<AnnouncementsContextValue>(() => ({
    announcements,
    readIds,
    unreadCount: announcements.reduce((count, item) => count + (readIds.has(item.id) ? 0 : 1), 0),
    loading,
    error,
    retry,
    markRead,
  }), [announcements, error, loading, markRead, readIds, retry]);

  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}

export function useGlobalAnnouncements() {
  const context = useContext(AnnouncementsContext);
  if (!context) throw new Error("useGlobalAnnouncements must be used within AnnouncementsProvider");
  return context;
}
