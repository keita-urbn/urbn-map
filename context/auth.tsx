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
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string; uid?: string }>;
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
      return "このメールアドレスのアカウントは見つかりませんでした。";
    case "auth/wrong-password":
      return "パスワードが正しくありません。";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "メールアドレスまたはパスワードが正しくありません。";
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
  const [loading, setLoading] = useState(!!auth);
  const [profile, setProfile] = useState<{ uid: string; data: Record<string, unknown> | undefined } | null>(null);
  const uid = user?.uid;
  const data = profile && profile.uid === uid ? profile.data : undefined;
  const role = data?.role;
  const isAdmin = role === "admin";
  const isPremium = isAdmin || role === "premium" || data?.premium === true;
  const premiumSince = typeof data?.premiumSince === "number" ? data.premiumSince : null;
  const plan = typeof data?.plan === "string" ? data.plan : null;

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setProfile((previous) => previous?.uid === nextUser?.uid ? previous : null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!uid || !db) return;
    let active = true;
    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        if (active && auth?.currentUser?.uid === uid) setProfile({ uid, data: snapshot.data() });
      },
      (error) => {
        if (!active || auth?.currentUser?.uid !== uid) return;
        console.error("[auth] role fetch error:", error.code, error.message);
        setProfile(null);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  const refreshPremium = useCallback(async () => {
    if (!uid || !db) return;
    try {
      const snapshot = await getDoc(doc(db, "users", uid));
      if (auth?.currentUser?.uid === uid) setProfile({ uid, data: snapshot.data() });
    } catch (error) {
      console.warn("[auth] refreshPremium error:", error);
    }
  }, [uid]);

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
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return { ok: true, uid: result.user.uid };
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
