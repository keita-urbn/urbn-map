// lib/usageLimits.ts
// Usage tracking for free-plan limits.
//
// Route guidance usage is persisted in Firestore at:
//   users/{userId}/usage/route_guidance
//   {
//     timestamps:   number[]       — epoch ms of each use (within 14-day window)
//     recentCount:  number         — count of timestamps within the last 14 days
//     lastUsedAt:   number | null  — most-recent timestamp, or null
//   }
//
// Summary fields (recentCount, lastUsedAt) are recomputed on every write so
// the Firebase Console shows readable state at a glance.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

// ── Constants ─────────────────────────────────────────────────────────────────
export const ROUTE_GUIDANCE_LIMIT = 3;
export const ROUTE_GUIDANCE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const FAVORITES_LIMIT = 3;

// ── Firestore path ────────────────────────────────────────────────────────────
// users/{uid}/usage/route_guidance  →  { timestamps, recentCount, lastUsedAt }
function routeGuidanceDocRef(uid: string) {
  return doc(db, `users/${uid}/usage/route_guidance`);
}

// ── Route guidance usage ──────────────────────────────────────────────────────

// ── Document shape ───────────────────────────────────────────────────────────
interface RouteGuidanceDoc {
  timestamps: number[];
  recentCount: number;
  lastUsedAt: number | null;
}

/**
 * Builds the full Firestore document payload from a pruned timestamps array.
 * Computes summary fields so the Firebase Console is always readable.
 */
function buildRouteGuidancePayload(recentTimestamps: number[]): RouteGuidanceDoc {
  return {
    timestamps: recentTimestamps,
    recentCount: recentTimestamps.length,
    lastUsedAt: recentTimestamps.length > 0
      ? Math.max(...recentTimestamps)
      : null,
  };
}

/**
 * Returns timestamps of route guidance uses within the last 14 days
 * by reading from Firestore (users/{uid}/usage/route_guidance).
 */
async function getRecentRouteGuidanceTimestamps(uid: string): Promise<number[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDoc(routeGuidanceDocRef(uid));
    if (!snap.exists()) return [];
    const all: number[] = snap.data()?.timestamps ?? [];
    const cutoff = Date.now() - ROUTE_GUIDANCE_WINDOW_MS;
    return all.filter((t) => t >= cutoff);
  } catch (e) {
    console.warn("[usageLimits] getRecentRouteGuidanceTimestamps error:", e);
    return [];
  }
}

/**
 * Returns how many times route guidance was used in the last 14 days.
 */
export async function getRouteGuidanceUsageCount(uid: string): Promise<number> {
  const recent = await getRecentRouteGuidanceTimestamps(uid);
  return recent.length;
}

/**
 * Returns true if the user is allowed to use route guidance right now.
 * Premium users always pass. Free users need count < ROUTE_GUIDANCE_LIMIT.
 */
export async function canUseRouteGuidance(
  uid: string | null | undefined,
  isPremium: boolean
): Promise<boolean> {
  if (isPremium) return true;
  if (!uid) return true; // not logged in — let them try, auth will gate
  const count = await getRouteGuidanceUsageCount(uid);
  return count < ROUTE_GUIDANCE_LIMIT;
}

/**
 * Records one route guidance use for the given user.
 * Reads existing timestamps, prunes old ones, appends current timestamp,
 * and writes back to Firestore at users/{uid}/usage/route_guidance.
 */
export async function recordRouteGuidanceUse(uid: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const recent = await getRecentRouteGuidanceTimestamps(uid);
    const updated = [...recent, Date.now()];
    await setDoc(
      routeGuidanceDocRef(uid),
      buildRouteGuidancePayload(updated),
      { merge: false } // overwrite the document — pruned list replaces old
    );
  } catch (e) {
    console.warn("[usageLimits] recordRouteGuidanceUse error:", e);
  }
}

// ── Favorites limit ───────────────────────────────────────────────────────────

/**
 * Returns true if the user can add another favorite.
 * Premium users always pass. Free users need currentCount < FAVORITES_LIMIT.
 */
export function canAddFavorite(
  currentCount: number,
  isPremium: boolean
): boolean {
  if (isPremium) return true;
  return currentCount < FAVORITES_LIMIT;
}
