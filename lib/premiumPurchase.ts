// lib/premiumPurchase.ts
// Closed-beta-only simulated premium activation & restore logic.
// This does not process a payment or charge the tester.
//
// This module writes / reads premium state directly on the Firestore
// users/{uid} document.  It is designed to be swapped later for real
// App Store / Google Play billing — only the trigger changes; the
// Firestore write that grants premium stays the same.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PurchaseResult {
  ok: boolean;
  error?: string;
}

export interface RestoreResult {
  ok: boolean;
  /** true when premium was found and restored */
  restored: boolean;
  error?: string;
}

// ── Dummy purchase ────────────────────────────────────────────────────────────

/**
 * Simulates a premium purchase by writing premium state to the user doc.
 *
 * Later this function body will be replaced with:
 *   1. Start real StoreKit / Google Play purchase flow
 *   2. On success → call the same Firestore write below
 *
 * The rest of the app (auth context, restriction system) does NOT need to
 * change when that swap happens.
 */
export async function dummyPurchase(uid: string): Promise<PurchaseResult> {
  if (!isFirebaseConfigured || !db) {
    return { ok: false, error: "Firebase が設定されていません" };
  }
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        premium: true,
        plan: "premium",
        premiumSince: Date.now(),
      },
      { merge: true },
    );
    return { ok: true };
  } catch (e: any) {
    console.error("[premiumPurchase] dummyPurchase error:", e);
    return {
      ok: false,
      error: e?.message ?? "購入処理中にエラーが発生しました",
    };
  }
}

// ── Dummy restore ─────────────────────────────────────────────────────────────

/**
 * Checks Firestore for existing premium state and returns it.
 *
 * Later this will be replaced with a real App Store / Google Play
 * receipt verification flow.  The Firestore read remains as a fallback
 * or server-side source of truth.
 */
export async function dummyRestore(uid: string): Promise<RestoreResult> {
  if (!isFirebaseConfigured || !db) {
    return { ok: false, restored: false, error: "Firebase が設定されていません" };
  }
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data()?.premium === true) {
      return { ok: true, restored: true };
    }
    return { ok: true, restored: false };
  } catch (e: any) {
    console.error("[premiumPurchase] dummyRestore error:", e);
    return {
      ok: false,
      restored: false,
      error: e?.message ?? "復元処理中にエラーが発生しました",
    };
  }
}
