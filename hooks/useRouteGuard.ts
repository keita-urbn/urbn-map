// hooks/useRouteGuard.ts
// Centralised route-action guard.
// Every map/direction/search action in the app must go through this hook
// so all route-related actions share one usage bucket.

import { useCallback, useState } from "react";
import { Linking, Platform } from "react-native";

import { useAuth } from "../context/auth";
import {
    canUseRouteGuidance,
    recordRouteGuidanceUse,
} from "../lib/usageLimits";

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
    async (action: () => Promise<void>) => {
      const allowed = await canUseRouteGuidance(user?.uid, isPremium);
      if (!allowed) {
        setUpsellVisible(true);
        return false;
      }
      // Record before executing so count is up-to-date even if the user
      // quickly taps again.
      if (user?.uid && !isPremium) {
        await recordRouteGuidanceUse(user.uid);
      }
      await action();
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
      destName?: string
    ) => {
      return guard(() => executeDirections(lat, lng, mode, destName));
    },
    [guard]
  );

  /** Guarded Google Maps search */
  const guardedSearch = useCallback(
    async (query: string) => {
      return guard(() => executeSearch(query));
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
    async (shop: { lat?: any; lng?: any; name?: string }) => {
      const lat = Number(shop.lat);
      const lng = Number(shop.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      return guard(() => executeDirections(lat, lng, "walking", shop.name));
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
