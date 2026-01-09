import { Tabs } from "expo-router";
import "leaflet/dist/leaflet.css";
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: "center" }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          headerTitle: "Map",
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "List",
          headerTitle: "List",
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

