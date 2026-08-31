// hooks/useRouteGuard.ts
// Centralised route-action guard.
// Every map/direction/search action in the app must go through this hook
// so all route-related actions share one usage bucket.

import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, Platform } from "react-native";

import { useAuth } from "../context/auth";
import {
    consumeRouteGuidanceUse,
} from "../lib/usageLimits";
import { incrementRouteClickCount } from "../lib/shopMetrics";

const UPSELL_MESSAGE =
  "フリープランのルート案内は14日間で3回までです。\nPremiumプランにアップグレードすると無制限でご利用いただけます。";

// ── Helpers to open maps ──────────────────────────────────────────────────────

function openOnWeb(url: string) {
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

async function openUrl(url: string) {
  if (Platform.OS === "web") {
    openOnWeb(url);
  } else {
    await Linking.openURL(url);
  }
}

async function executeDirections(
  lat: number,
  lng: number,
  mode: "walking" | "driving" | "transit" = "walking",
  destName?: string
) {
  const q = encodeURIComponent(destName ?? `${lat},${lng}`);
  const webUrl =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(`${lat},${lng}`)}` +
    `&travelmode=${encodeURIComponent(mode)}` +
    `&query=${q}`;

  if (Platform.OS === "web") {
    openOnWeb(webUrl);
    return;
  }

  const googleAppUrl =
    Platform.OS === "ios"
      ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=${mode}`
      : `google.navigation:q=${lat},${lng}`;

  try {
    const canOpen = await Linking.canOpenURL(googleAppUrl);
    await Linking.openURL(canOpen ? googleAppUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

async function executeSearch(query: string) {
  const q = encodeURIComponent(query);
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;

  if (Platform.OS === "web") {
    openOnWeb(webUrl);
    return;
  }

  const googleAppUrl =
    Platform.OS === "ios"
      ? `comgooglemaps://?q=${q}`
      : `geo:0,0?q=${q}`;

  try {
    const canOpen = await Linking.canOpenURL(googleAppUrl);
    await Linking.openURL(canOpen ? googleAppUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRouteGuard() {
  const { user, isPremium } = useAuth();
  const [upsellVisible, setUpsellVisible] = useState(false);

  /**
   * Central guard: check eligibility → record usage → execute action.
   * Returns `true` if the action was executed, `false` if blocked.
   */
  const guard = useCallback(
    async (action: () => Promise<void>, shopId?: string) => {
      if (!user?.uid) {
        const goToLogin = () => router.push("/login");
        if (Platform.OS === "web") {
          // eslint-disable-next-line no-alert
          if (window.confirm("ルート案内を利用するにはログインが必要です。\nログイン画面を開きますか？")) goToLogin();
        } else {
          Alert.alert("", "ルート案内を利用するにはログインが必要です", [
            { text: "キャンセル", style: "cancel" },
            { text: "ログイン", onPress: goToLogin },
          ]);
        }
        return false;
      }

      const allowed = isPremium ? true : await consumeRouteGuidanceUse(user.uid);
      if (!allowed) {
        setUpsellVisible(true);
        return false;
      }
      await action();
      if (shopId) {
        try {
          await incrementRouteClickCount(shopId);
        } catch (error) {
          // Opening directions succeeded; analytics failure must not block the user.
          console.warn("[routeMetrics] increment failed", error);
        }
      }
      return true;
    },
    [user?.uid, isPremium]
  );

  // ── Pre-built guarded actions ────────────────────────────────────────────

  /** Guarded walking / driving directions */
  const guardedDirections = useCallback(
    async (
      lat: number,
      lng: number,
      mode: "walking" | "driving" | "transit" = "walking",
      destName?: string,
      shopId?: string,
    ) => {
      return guard(() => executeDirections(lat, lng, mode, destName), shopId);
    },
    [guard]
  );

  /** Guarded Google Maps search */
  const guardedSearch = useCallback(
    async (query: string, shopId?: string) => {
      return guard(() => executeSearch(query), shopId);
    },
    [guard]
  );

  /** Guarded generic route action (for map pin popups that already build their own URL) */
  const guardedOpenUrl = useCallback(
    async (url: string) => {
      return guard(() => openUrl(url));
    },
    [guard]
  );

  /** Guarded directions for a ShopDoc-like object (used by map screens) */
  const guardedShopDirections = useCallback(
    async (shop: { id?: any; docId?: any; lat?: any; lng?: any; name?: string }) => {
      const lat = Number(shop.lat);
      const lng = Number(shop.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      const shopId = String(shop.id ?? shop.docId ?? "");
      return guard(() => executeDirections(lat, lng, "walking", shop.name), shopId || undefined);
    },
    [guard]
  );

  const dismissUpsell = useCallback(() => setUpsellVisible(false), []);

  return {
    guardedDirections,
    guardedSearch,
    guardedOpenUrl,
    guardedShopDirections,
    upsellVisible,
    upsellMessage: UPSELL_MESSAGE,
    dismissUpsell,
  } as const;
}
