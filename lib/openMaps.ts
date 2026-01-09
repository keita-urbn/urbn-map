// lib/openMaps.ts
import * as Linking from "expo-linking";
import { Platform } from "react-native";

type LatLng = { lat: number; lng: number };

export async function openGoogleMapsDirections(
  dest: LatLng,
  destName?: string,
  mode: "walking" | "driving" | "transit" = "walking"
) {
  const q = encodeURIComponent(destName ?? `${dest.lat},${dest.lng}`);

  // Google Maps アプリ優先（入ってなければWebへ）
  const googleAppUrl =
    Platform.OS === "ios"
      ? `comgooglemaps://?daddr=${dest.lat},${dest.lng}&directionsmode=${mode}`
      : `google.navigation:q=${dest.lat},${dest.lng}`;

  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=${mode}&query=${q}`;

  const canOpen = await Linking.canOpenURL(googleAppUrl);
  await Linking.openURL(canOpen ? googleAppUrl : webUrl);
}

export async function openGoogleMapsSearch(query: string) {
  const q = encodeURIComponent(query);
  const googleAppUrl =
    Platform.OS === "ios"
      ? `comgooglemaps://?q=${q}`
      : `geo:0,0?q=${q}`;

  const webUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;

  const canOpen = await Linking.canOpenURL(googleAppUrl);
  await Linking.openURL(canOpen ? googleAppUrl : webUrl);
}
