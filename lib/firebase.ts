// lib/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  // @ts-ignore -- type stubs always present; runtime import guarded by Platform check
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

/**
 * Expo / Web 共通
 *
 * NOTE:
 * The Storage bucket must match the actual Firebase Console bucket:
 * urbn-map-5ef26.firebasestorage.app
 *
 * This config is currently hardcoded for debugging.
 * After confirming everything works, move these values back to .env.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBbWxPuyj-nxOeSxRwrufDYUWwMPIW_Tuw",
  authDomain: "urbn-map-5ef26.firebaseapp.com",
  projectId: "urbn-map-5ef26",
  storageBucket: "urbn-map-5ef26.firebasestorage.app",
  messagingSenderId: "426065063948",
  appId: "1:426065063948:web:bf06d65957809dfe07e29",
};

// DEBUG: remove after Firebase initialization is confirmed stable
console.log("🔥 FINAL FIREBASE CONFIG", firebaseConfig);

export const isFirebaseConfigured = true;

let app: any = null;
let db: any = null;
let storage: any = null;
let auth: any = null;

try {
  if (isFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    db = getFirestore(app);

    // IMPORTANT:
    // Use the bucket configured in firebaseConfig.
    // This must resolve to:
    // urbn-map-5ef26.firebasestorage.app
    storage = getStorage(app);

    // Auth:
    // - Web: normal Firebase Auth
    // - Native: AsyncStorage persistence
    if (Platform.OS === "web") {
      auth = getAuth(app);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactNativeAsyncStorage =
        require("@react-native-async-storage/async-storage").default;

      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    }

    console.log("🔥 FIREBASE INITIALIZED", {
      projectId: app?.options?.projectId,
      storageBucket: app?.options?.storageBucket,
      actualStorageBucket: storage?.app?.options?.storageBucket,
      platform: Platform.OS,
    });
  }
} catch (e) {
  console.warn(
    "⚠️ Firebase initialization failed:",
    e,
    "- using fallback data"
  );
}

export { app, auth, db, storage };
