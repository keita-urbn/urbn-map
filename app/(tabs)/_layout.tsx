// app/(tabs)/_layout.tsx
import { router, Tabs } from "expo-router";
import "leaflet/dist/leaflet.css";
import { Pressable, Text } from "react-native";

import { useAuth } from "../../context/auth";
import { useTheme } from "../../theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,

        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: "#ef4444", // ← 赤
        tabBarInactiveTintColor: colors.muted,

        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "900",
        },

        // ── Login / user button in the header ──
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/login")}
            style={({ pressed }) => ({
              marginRight: 14,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: user ? "#ef4444" : colors.muted,
              }}
            >
              {user ? user.email?.split("@")[0] ?? "アカウント" : "ログイン"}
            </Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "地図" }} />
      <Tabs.Screen name="list" options={{ title: "ショップ一覧" }} />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "お気に入り",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "情報カテゴリ",
        }}
      />
    </Tabs>
  );
}
