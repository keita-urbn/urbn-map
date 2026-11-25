// lib/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseAuth from "firebase/auth";
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

    if (Platform.OS === "web") {
      auth = FirebaseAuth.getAuth(app);
    } else {
      // Metro resolves a React Native auth build, while the public types describe the web build.
      const nativePersistence: unknown = Reflect.get(FirebaseAuth, "getReactNativePersistence");
      if (typeof nativePersistence !== "function") throw new Error("Firebase native persistence unavailable");
      auth = FirebaseAuth.initializeAuth(app, { persistence: nativePersistence(AsyncStorage) });
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
