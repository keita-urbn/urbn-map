// components/MapWebScreen.tsx
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useShops } from "../hooks/useShops";
import { openGoogleMapsDirections } from "../lib/openMaps";
import type { ShopDoc } from "../types/shop";

import ShopMapWeb from "./ShopMap.web";

function normalize(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

function idOf(s: any) {
  return String(s?.id ?? s?.docId ?? "");
}

export default function MapWebScreen() {
  const { shops, loading } = useShops();
  const [text, setText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const onOpenDetail = useCallback((shop: ShopDoc) => {
    const id = idOf(shop);
    if (!id) return;
    router.push(`/shop/${id}`);
  }, []);

  const onOpenDirections = useCallback((shop: ShopDoc) => {
    openGoogleMapsDirections(shop);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>地図</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSelectedId(null);
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

      <ShopMapWeb
        shops={filtered}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onOpenDetail={onOpenDetail}
        onOpenDirections={onOpenDirections}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleWrap: {
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "900" },

  searchWrap: {
    position: "absolute",
    top: 56,
    left: 10,
    right: 10,
    zIndex: 1000,
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
    top: 108,
    left: 10,
    zIndex: 1000,
    backgroundColor: "white",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  badgeText: { fontWeight: "800" },
});