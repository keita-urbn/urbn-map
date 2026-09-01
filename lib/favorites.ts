// lib/favorites.ts
// ─────────────────────────────────────────────────────────────────
// Single Firestore subscription shared across ALL consumers.
// Automatically re-subscribes when Firebase Auth user changes.
// ─────────────────────────────────────────────────────────────────
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, Platform } from "react-native";

import { auth, db, isFirebaseConfigured } from "./firebase";
import { FAVORITES_LIMIT } from "./usageLimits";

/* ═══════════════════════════════════════
   Module-level singleton store
   ═══════════════════════════════════════ */
type Listener = (ids: string[]) => void;

let _ids: string[] = [];
let _loading = true;
let _toggleLock = false;
let _firestoreUnsub: (() => void) | null = null;
let _currentUid: string | null = null;
const _listeners = new Set<Listener>();

function _notify() {
  _listeners.forEach((fn) => fn([..._ids]));
}

/** Tear down the current Firestore listener and reset state. */
function _teardown() {
  if (_firestoreUnsub) {
    _firestoreUnsub();
    _firestoreUnsub = null;
  }
  _ids = [];
  _loading = true;
  _currentUid = null;
}

/** Subscribe to /users/{uid}/favorites in Firestore. */
function _subscribe(uid: string) {
  if (!isFirebaseConfigured || !db) {
    _loading = false;
    _notify();
    return;
  }

  const colRef = collection(db, `users/${uid}/favorites`);
  _firestoreUnsub = onSnapshot(
    colRef,
    (snap) => {
      // An already queued callback can arrive after logout/account switching.
      if (_currentUid !== uid) return;
      _ids = snap.docs.map((d) => d.id);
      _loading = false;
      console.log("[favorites] onSnapshot →", _ids.length, "ids");
      _notify();
    },
    (err) => {
      if (_currentUid !== uid) return;
      console.error("[favorites] onSnapshot error:", err?.code, err?.message);
      _loading = false;
      _notify();
    },
  );
}

/**
 * Called once at module load.
 * Listens to onAuthStateChanged and re-subscribes favorites
 * whenever the user signs in or out.
 */
function _listenAuth() {
  if (!auth) return;
  onAuthStateChanged(auth, (user) => {
    const uid = user?.uid ?? null;
    console.log("[favorites] auth changed → uid:", uid);

    // Nothing changed
    if (uid === _currentUid) return;

    // Tear down old subscription
    _teardown();
    _currentUid = uid;

    if (uid) {
      _subscribe(uid);
    } else {
      // Logged out → empty list immediately
      _ids = [];
      _loading = false;
      _notify();
    }
  });
}

// Start auth listener as soon as this module is imported
_listenAuth();

/* ── Navigate to login helper ── */
function _promptLogin() {
  if (Platform.OS === "web") {
    // React Native's Alert is not consistently implemented by web browsers.
    // eslint-disable-next-line no-alert
    if (window.confirm("お気に入りを保存するにはログインが必要です。\nログイン画面を開きますか？")) {
      router.push("/login");
    }
    return;
  }
  Alert.alert("", "お気に入りを保存するにはログインが必要です", [
    { text: "キャンセル", style: "cancel" },
    {
      text: "ログイン",
      onPress: () => router.push("/login"),
    },
  ]);
}

async function _toggle(
  shopId: string,
  isPremium: boolean
): Promise<{ ok: boolean; reason?: "limit_reached" | "not_logged_in" }> {
  // Gate: must be logged in
  const uid = _currentUid;
  if (!uid) {
    _promptLogin();
    return { ok: false, reason: "not_logged_in" };
  }

  if (_toggleLock) return { ok: false };
  _toggleLock = true;

  const currently = _ids.includes(shopId);

  // Free plan: cap at FAVORITES_LIMIT when adding
  if (!currently && !isPremium && _ids.length >= FAVORITES_LIMIT) {
    _toggleLock = false;
    return { ok: false, reason: "limit_reached" };
  }

  console.log("[favorites] toggle", { uid, shopId, wasFavorite: currently });

  // Optimistic update
  _ids = currently ? _ids.filter((id) => id !== shopId) : [..._ids, shopId];
  _notify();

  try {
    if (isFirebaseConfigured && db) {
      const favoriteRef = doc(db, `users/${uid}/favorites`, shopId);
      const shopRef = doc(db, "shops", shopId);
      await runTransaction(db, async (tx) => {
        const [favoriteSnap, shopSnap] = await Promise.all([
          tx.get(favoriteRef),
          tx.get(shopRef),
        ]);
        const exists = favoriteSnap.exists();
        const count = Math.max(0, Number(shopSnap.data()?.favoriteCount ?? 0));

        if (exists) {
          tx.delete(favoriteRef);
          tx.update(shopRef, { favoriteCount: Math.max(0, count - 1) });
        } else {
          tx.set(favoriteRef, { createdAt: serverTimestamp() });
          tx.update(shopRef, { favoriteCount: count + 1 });
        }
      });
      console.log("[favorites] Firestore write OK", { shopId, action: currently ? "delete" : "set" });
      // onSnapshot will reconcile the final state
    }
    return { ok: true };
  } catch (e: any) {
    console.error("[favorites] toggle error:", e?.code, e?.message, e);
    // Never let an operation started by a previous account alter the active
    // account's in-memory favorites after logout/login.
    if (_currentUid === uid) {
      _ids = currently ? [..._ids, shopId] : _ids.filter((id) => id !== shopId);
      _notify();
    }
    return { ok: false };
  } finally {
    _toggleLock = false;
  }
}

/* ═══════════════════════════════════════
   React hook — thin wrapper over the store
   ═══════════════════════════════════════ */
export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(_ids);
  const [loading, setLoading] = useState(_loading);

  useEffect(() => {
    // Subscribe to store updates
    const listener: Listener = (ids) => {
      setFavoriteIds(ids);
      setLoading(false);
    };
    _listeners.add(listener);

    // Sync immediately with current state
    setFavoriteIds([..._ids]);
    setLoading(_loading);

    return () => {
      _listeners.delete(listener);
    };
  }, []);

  const isFavorite = useCallback(
    (shopId: string) => favoriteIds.includes(shopId),
    [favoriteIds],
  );

  const toggle = useCallback(
    (shopId: string, isPremium = false) => _toggle(shopId, isPremium),
    []
  );

  return { favoriteIds, isFavorite, toggle, loading } as const;
}
