// context/auth.tsx
import { createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, signInWithEmailAndPassword, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { auth, db } from "../lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  /** epoch-ms timestamp when premium was first activated, or null */
  premiumSince: number | null;
  /** plan string from Firestore ("premium" | "free" | …), or null if unset */
  plan: string | null;
  /** Force-reload the user doc from Firestore and re-evaluate premium state. */
  refreshPremium: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません";
    case "auth/user-disabled":
      return "このアカウントは無効です";
    case "auth/user-not-found":
      return "アカウントが見つかりません";
    case "auth/wrong-password":
      return "パスワードが間違っています";
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが正しくありません";
    case "auth/email-already-in-use":
      return "このメールアドレスはすでに使われています";
    case "auth/weak-password":
      return "パスワードは6文字以上にしてください";
    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらくお待ちください";
    case "auth/network-request-failed":
      return "ネットワークに接続できません";
    default:
      return "エラーが発生しました";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumSince, setPremiumSince] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Derive admin / premium from a snapshot of the user document.
  // Premium is true if: role is "admin" or "premium", OR if the
  // `premium` field is explicitly `true` (set by the purchase flow).
  function applyUserDoc(data: Record<string, any> | undefined) {
    const role = data?.role;
    const premiumField = data?.premium === true;
    setIsAdmin(role === "admin");
    setIsPremium(role === "premium" || role === "admin" || premiumField);
    setPremiumSince(typeof data?.premiumSince === "number" ? data.premiumSince : null);
    setPlan(typeof data?.plan === "string" ? data.plan : null);
    console.log(
      "[auth] role:", role,
      "premium field:", premiumField,
      "isAdmin:", role === "admin",
      "isPremium:", role === "premium" || role === "admin" || premiumField,
    );
  }

  // Subscribe to users/{uid} doc to derive isAdmin / isPremium
  useEffect(() => {
    if (!user?.uid || !db) {
      setIsAdmin(false);
      setIsPremium(false);
      return;
    }
    const docRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      docRef,
      (snap) => applyUserDoc(snap.data()),
      (err) => {
        console.error("[auth] role fetch error:", err?.code, err?.message);
        setIsAdmin(false);
        setIsPremium(false);
        setPremiumSince(null);
        setPlan(null);
      },
    );
    return unsub;
  }, [user?.uid]);

  /** Force-reload users/{uid} and re-evaluate premium. */
  const refreshPremium = useCallback(async () => {
    if (!user?.uid || !db) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      applyUserDoc(snap.data());
    } catch (e) {
      console.warn("[auth] refreshPremium error:", e);
    }
  }, [user?.uid]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) return { ok: false, error: "Firebase未設定" };
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (e: any) {
      console.error("[auth] signIn raw error:", e?.code, e?.message, e);
      return { ok: false, error: friendlyError(e?.code ?? "") };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!auth) return { ok: false, error: "Firebase未設定" };
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: friendlyError(e?.code ?? "") };
    }
  }, []);

  const signOutFn = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAdmin, isPremium, premiumSince, plan, refreshPremium, signIn, signUp, signOut: signOutFn }),
    [user, loading, isAdmin, isPremium, premiumSince, plan, refreshPremium, signIn, signUp, signOutFn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
