import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { useGlobalAnnouncements } from "../context/announcements";
import { useTheme } from "../theme";

function getSourceTab(pathname: string): "map" | "shop" | "favorites" | "trending" {
  const normalized = pathname.split("?")[0];

  if (["/", "/index", "/(tabs)", "/(tabs)/"].includes(normalized)) return "map";
  if (["/list"].includes(normalized)) return "shop";
  if (["/favorites"].includes(normalized)) return "favorites";
  if (["/explore"].includes(normalized)) return "trending";

  return "map";
}

export default function NotificationBell() {
  const { unreadCount } = useGlobalAnnouncements();
  const { colors } = useTheme();
  const pathname = usePathname();

  return (
    <Pressable
      accessibilityLabel={unreadCount ? "お知らせ、未読あり" : "お知らせ"}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.push({ pathname: "/notifications", params: { from: getSourceTab(pathname) } })}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="notifications-outline" size={23} color={colors.text} />
      {unreadCount > 0 ? <View style={styles.badge} accessibilityLabel="未読通知" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 40,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.55 },
  badge: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#ef4444",
  },
});
