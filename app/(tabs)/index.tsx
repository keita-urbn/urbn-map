// app/(tabs)/index.tsx
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { useShops } from "../../hooks/useShops";
import { openGoogleMapsDirections } from "../../lib/openMaps";
import type { ShopDoc } from "../../types/shop";

const ShopMap =
  Platform.OS === "web"
    ? require("../../components/ShopMap.web").default
    : require("../../components/ShopMap.native").default;

// 初期表示（東京）
const TOKYO = {
  latitude: 35.681236,
  longitude: 139.767125,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
};

function normalize(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

export default function MapScreen() {
  const { shops, loading } = useShops();
  const [text, setText] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(text);
    if (!q) return shops;
    return (shops ?? []).filter((s: any) =>
      [
        s.name,
        s.area,
        s.genre,
        s.address,
        s.brands,
        s.instagram,
        s.comment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [shops, text]);

  const openDetail = (s: ShopDoc) => {
    router.push({ pathname: "/shop/[id]", params: { id: String((s as any).id) } } as any);
  };

  const openDirections = (s: ShopDoc) => {
    const lat = Number((s as any).lat);
    const lng = Number((s as any).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    openGoogleMapsDirections({ lat, lng }, (s as any).name, "walking");
  };

  return (
    <View style={{ flex: 1 }}>
      <ShopMap
        shops={filtered}
        initialRegion={TOKYO}
        onOpenDetail={openDetail}
        onOpenDirections={openDirections}
      />

      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="渋谷 / 中目黒 / ブランド古着 …"
          style={styles.search}
        />
      </View>

      <View style={styles.badge}>
        <Text>{loading ? "Loading..." : `全件表示：${filtered.length}件`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
  },
  search: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  badge: {
    position: "absolute",
    top: 62,
    left: 12,
    backgroundColor: "white",
    padding: 8,
    borderRadius: 12,
  },
});
