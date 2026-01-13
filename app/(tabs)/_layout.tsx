// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import "leaflet/dist/leaflet.css";

import { useTheme } from "../../theme"; // ✅ 統一

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,

        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,

        // ✅ フォント統一（地図/ショップ一覧/詳細/編集と合わせる）
        headerTitleStyle: { fontSize: 18, fontWeight: "900" },

        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "地図", headerTitle: "地図" }} />
      <Tabs.Screen
        name="list"
        options={{ title: "ショップ一覧", headerTitle: "ショップ一覧" }}
      />
      <Tabs.Screen name="explore" options={{ title: "explore", headerTitle: "explore" }} />
    </Tabs>
  );
}