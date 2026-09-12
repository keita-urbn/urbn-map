// lib/openMaps.ts
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import { getMapsDestination } from "./mapsDestination";

type LatLng = { lat?: number; lng?: number; address?: string };

function openOnWeb(url: string) {
  // ✅ WebはLinking経由だと無反応になることがあるのでwindow.openで確実に開く
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openGoogleMapsDirections(
  dest: LatLng,
  destName?: string,
  mode: "walking" | "driving" | "transit" = "walking"
) {
  const destination = getMapsDestination({ ...dest, name: destName });
  if (!destination) return;
  const q = encodeURIComponent(destination);

  // Google Maps Web URL（最後は絶対ここに逃がす）
  const webUrl =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${q}` +
    `&travelmode=${encodeURIComponent(mode)}` +
    `&query=${q}`;

  // ✅ Webはここで確実に開く
  if (Platform.OS === "web") {
    openOnWeb(webUrl);
    return;
  }

  // iOS/Android：Google Mapsアプリ優先（入ってなければweb）
  const googleAppUrl =
    Platform.OS === "ios"
      ? `comgooglemaps://?daddr=${q}&directionsmode=${mode}`
      : `google.navigation:q=${q}`;

  try {
    const canOpen = await Linking.canOpenURL(googleAppUrl);
    await Linking.openURL(canOpen ? googleAppUrl : webUrl);
  } catch {
    // 最後の保険
    await Linking.openURL(webUrl);
  }
}

export async function openGoogleMapsSearch(query: string) {
  const q = encodeURIComponent(query);
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;

  // ✅ Webは確実に開く
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