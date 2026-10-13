import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Tabs } from "expo-router";
import "leaflet/dist/leaflet.css";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapOverlayProvider, useMapOverlay } from "../../context/mapOverlay";
import { StatusBar } from "expo-status-bar";
import { FLOATING_TAB_HEIGHT } from "../../hooks/useTabContentInsets";
import { useTheme } from "../../theme";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const destinations = [
  { route: "index", label: "MAP", icon: "map-outline" },
  { route: "list", label: "SEARCH", icon: "search-outline" },
  { route: "favorites", label: "SAVED", icon: "analytics-outline" },
  { route: "explore", label: "TRENDING", icon: "information-circle-outline" },
  { route: "account", label: "ACCOUNT", icon: "person-outline" },
] as const;
function FloatingNavigation({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { sheetOpen } = useMapOverlay();
  if (sheetOpen && state.routes[state.index].name === "index") return null;
  return <View style={[styles.bar, { bottom: Math.max(insets.bottom, 12), backgroundColor: colors.card, borderColor: colors.border }]}>
    {destinations.map(item => {
      const route = state.routes.find(r => r.name === item.route)!;
      const active = state.routes[state.index].key === route.key;
      return <Pressable key={item.route} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }}
        onPress={() => { const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (!event.defaultPrevented) navigation.navigate(route.name, item.route === "account" ? { returnTo: undefined } : undefined); }}
        style={styles.item}>
        <Ionicons name={item.icon} size={23} color={active ? "#ef4444" : colors.muted} />
        {active && <View style={styles.activeDot} />}
      </Pressable>;
    })}

  </View>;
}
export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  return <MapOverlayProvider>
    <StatusBar style={isDark ? "light" : "dark"} hidden={false} />
    <Tabs tabBar={props => <FloatingNavigation {...props} />} screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: colors.background },
    }}>
      <Tabs.Screen name="index" options={{ title: "MAP" }} />
      <Tabs.Screen name="list" options={{ title: "SEARCH" }} />
      <Tabs.Screen name="favorites" options={{ title: "SAVED" }} />
      <Tabs.Screen name="explore" options={{ title: "Trending" }} />
      <Tabs.Screen name="account" options={{ title: "ACCOUNT" }} />
    </Tabs>
  </MapOverlayProvider>;
}
const styles = StyleSheet.create({
  bar: { position: "absolute", alignSelf: "center", flexDirection: "row", height: FLOATING_TAB_HEIGHT, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 26, borderWidth: 1, shadowColor: "#000", shadowOpacity: .16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  item: { width: 46, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  activeDot: { position: "absolute", bottom: 3, width: 3, height: 3, borderRadius: 2, backgroundColor: "#ef4444" },
});
