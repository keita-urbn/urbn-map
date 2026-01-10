// app/(tabs)/index.tsx
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { Region } from "react-native-maps";

import ShopMap from "../../components/ShopMap"; // 拡張子なし（.native/.web を自動解決）
import { useShops } from "../../hooks/useShops";
import { openGoogleMapsDirections } from "../../lib/openMaps";
import type { ShopDoc } from "../../types/shop";

function normalize(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

export default function MapScreen() {
  const { shops, loading } = useShops();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<ShopDoc | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(text);
    if (!q) return (shops ?? []) as ShopDoc[];
    return (shops ?? []).filter((s: any) => {
      const hay = [s?.name, s?.area, s?.genre, s?.address, s?.brands]
        .filter(Boolean)
        .map(normalize)
        .join(" ");
      return hay.includes(q);
    }) as ShopDoc[];
  }, [shops, text]);

  const initialRegion: Region = {
    latitude: 35.681236,
    longitude: 139.767125,
    latitudeDelta: 0.18,
    longitudeDelta: 0.18,
  };

  const onOpenDetail = useCallback((shop: ShopDoc) => {
    const id = String((shop as any).id ?? (shop as any).docId ?? "");
    if (!id) return;
    router.push(`/shop/${id}`);
  }, []);

  const onOpenDirections = useCallback((shop: ShopDoc) => {
    openGoogleMapsDirections(shop);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSelected(null);
          }}
          placeholder="渋谷 / 中目黒 / ブランド古着 ...で絞り込み"
          placeholderTextColor="#9ca3af"
          style={styles.search}
        />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {loading ? "読み込み中..." : `全件表示：${filtered.length}件`}
        </Text>
      </View>

      <ShopMap
        shops={filtered}
        initialRegion={initialRegion}
        selected={selected}
        onSelect={setSelected}
        onOpenDetail={onOpenDetail}
        onOpenDirections={onOpenDirections}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
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
    left: 10,
    zIndex: 10,
    backgroundColor: "white",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  badgeText: { fontWeight: "800" },
});
