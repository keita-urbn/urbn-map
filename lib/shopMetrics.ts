import { doc, runTransaction } from "firebase/firestore";

import { auth, db } from "./firebase";

/** Increment only after a guarded route action successfully opens Maps. */
export async function incrementRouteClickCount(shopId: string): Promise<void> {
  if (!auth?.currentUser?.uid || !shopId) return;

  const shopRef = doc(db, "shops", shopId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(shopRef);
    if (!snap.exists()) return;
    const current = Math.max(0, Number(snap.data()?.routeClickCount ?? 0));
    tx.update(shopRef, { routeClickCount: current + 1 });
  });
}
