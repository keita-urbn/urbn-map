// lib/openMaps.ts
import * as Linking from "expo-linking";
import { Platform } from "react-native";

type LatLng = { lat: number; lng: number };

function openOnWeb(url: string) {
  // ✅ WebはLinking経由だと無反応になることがあるのでwindow.openで確実に開く
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openGoogleMapsDirections(
  dest: LatLng,
  destName?: string,
  mode: "walking" | "driving" | "transit" = "walking"
) {
  const q = encodeURIComponent(destName ?? `${dest.lat},${dest.lng}`);

  // Google Maps Web URL（最後は絶対ここに逃がす）
  const webUrl =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(`${dest.lat},${dest.lng}`)}` +
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
      ? `comgooglemaps://?daddr=${dest.lat},${dest.lng}&directionsmode=${mode}`
      : `google.navigation:q=${dest.lat},${dest.lng}`;

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