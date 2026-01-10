// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import "leaflet/dist/leaflet.css";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,          // ✅ Tabsヘッダーを表示（ここが一番上のヘッダーになる）
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "地図",
          headerTitle: "地図",
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "ショップ一覧",
          headerTitle: "ショップ一覧",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "explore",
          headerTitle: "explore",
        }}
      />
    </Tabs>
  );
}