// app/(tabs)/explore.tsx
import { Text, View } from "react-native";

export default function ExploreScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "800" }}>Explore</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>ここは後で拡張用（おすすめ/特集/ランキング等）</Text>
    </View>
  );
}
