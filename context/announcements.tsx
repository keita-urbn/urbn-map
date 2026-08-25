import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "./auth";
import {
  markAnnouncementRead,
  subscribeAnnouncementReads,
  subscribePublishedAnnouncements,
} from "../lib/announcements";
import type { Announcement } from "../types/announcement";

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
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);
  const hasLoadedFeed = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setSubscriptionVersion((value) => value + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hasLoadedFeed.current) setLoading(true);
    setError("");
    const unsubscribe = subscribePublishedAnnouncements(
      (items) => {
        setAnnouncements(items);
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
    setReadIds(new Set());
    if (user?.uid) {
      return subscribeAnnouncementReads(
        user.uid,
        setReadIds,
        (readError) => console.error("[announcements] reads error:", readError),
      );
    }

    let active = true;
    AsyncStorage.getItem(GUEST_READS_KEY)
      .then((raw) => {
        if (!active) return;
        const parsed = raw ? JSON.parse(raw) : [];
        setReadIds(new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []));
      })
      .catch((readError) => console.warn("[announcements] guest reads load error:", readError));
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const markRead = useCallback(async (announcementId: string) => {
    if (!announcementId || readIds.has(announcementId)) return;
    const previous = readIds;
    const next = new Set(previous).add(announcementId);
    setReadIds(next);
    try {
      if (user?.uid) {
        await markAnnouncementRead(user.uid, announcementId);
      } else {
        await AsyncStorage.setItem(GUEST_READS_KEY, JSON.stringify([...next]));
      }
    } catch (markError) {
      console.error("[announcements] mark read error:", markError);
      setReadIds(previous);
      throw markError;
    }
  }, [readIds, user?.uid]);

  const value = useMemo<AnnouncementsContextValue>(() => ({
    announcements,
    readIds,
    unreadCount: announcements.reduce((count, item) => count + (readIds.has(item.id) ? 0 : 1), 0),
    loading,
    error,
    retry: () => setSubscriptionVersion((version) => version + 1),
    markRead,
  }), [announcements, error, loading, markRead, readIds]);

  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}

export function useGlobalAnnouncements() {
  const context = useContext(AnnouncementsContext);
  if (!context) throw new Error("useGlobalAnnouncements must be used within AnnouncementsProvider");
  return context;
}
