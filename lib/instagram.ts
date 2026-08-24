import { Linking, Platform } from "react-native";

const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;

export function normalizeInstagramUrl(value: string | null | undefined): string | null {
  let input = (value ?? "").trim();
  if (!input) return null;

  input = input.replace(/^@/, "");
  if (/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i.test(input)) {
    input = input.replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "");
  }

  const username = input.split(/[/?#]/, 1)[0].replace(/^@/, "");
  if (!USERNAME_PATTERN.test(username)) return null;
  return `https://www.instagram.com/${username}/`;
}

export async function openInstagram(value: string | null | undefined): Promise<boolean> {
  const webUrl = normalizeInstagramUrl(value);
  if (!webUrl) return false;
  const username = new URL(webUrl).pathname.split("/").filter(Boolean)[0];

  if (Platform.OS !== "web") {
    const appUrl = `instagram://user?username=${encodeURIComponent(username)}`;
    try {
      if (await Linking.canOpenURL(appUrl)) {
        await Linking.openURL(appUrl);
        return true;
      }
    } catch (error) {
      console.warn("[instagram] app open failed, falling back to web", error);
    }
  }

  try {
    if (Platform.OS !== "web") {
      // Keep behavior permissive: even if canOpenURL is false, still try opening HTTPS.
      await Linking.canOpenURL(webUrl);
    }
    await Linking.openURL(webUrl);
    return true;
  } catch (error) {
    console.warn("[instagram] web open failed", error);
    return false;
  }
}
