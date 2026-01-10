// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import "leaflet/dist/leaflet.css";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // ✅ Tabsヘッダーを消す（(tabs)の余白問題はここで根絶）
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Map" }} />
      <Tabs.Screen name="list" options={{ title: "List" }} />
      <Tabs.Screen name="explore" options={{ title: "explore" }} />
    </Tabs>
  );
}