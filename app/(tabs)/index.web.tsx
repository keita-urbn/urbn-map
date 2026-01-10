// app/(tabs)/index.web.tsx
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import ShopMap from "../../components/ShopMap";
import { useShops } from "../../hooks/useShops";
import { openGoogleMapsDirections } from "../../lib/openMaps";
import type { ShopDoc } from "../../types/shop";

// Web初期表示（東京）
const TOKYO = {
  latitude: 35.681236,
  longitude: 139.767125,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
};

function normalize(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

export default function MapScreenWeb() {
  const { shops, loading } = useShops();
  const [text, setText] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(text);
    if (!q) return shops;

    return (shops ?? []).filter((s: any) => {
      const hay = [
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
        .toLowerCase();
      return normalize(hay).includes(q);
    });
  }, [shops, text]);

  const countLabel = useMemo(() => {
    if (text.trim()) return `検索中：${(filtered ?? []).length}件`;
    return `全件表示：${(filtered ?? []).length}件`;
  }, [filtered, text]);

  // ✅ ShopMap が呼ぶ “詳細へ”
  const openDetail = (s: ShopDoc) => {
    const id = String((s as any).id ?? "");
    if (!id) return;
    router.push(`/shop/${id}` as any);
  };

  // ✅ ShopMap が呼ぶ “経路案内へ”
  const openDirections = (s: ShopDoc) => {
    const lat = Number((s as any).lat);
    const lng = Number((s as any).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    openGoogleMapsDirections({ lat, lng }, (s as any).name, "walking");
  };

  return (
    <View style={styles.container}>
      {/* Webは ShopMap.web.tsx が自動で使われる */}
      <ShopMap
        shops={(filtered ?? []) as ShopDoc[]}
        initialRegion={TOKYO as any}
        onOpenDetail={openDetail}
        onOpenDirections={openDirections}
      />

      {/* 検索バー */}
      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="渋谷 / 中目黒 / ブランド古着 ... で絞り込み"
          placeholderTextColor="#9CA3AF"
          style={styles.search}
        />
        {text.length > 0 && (
          <TouchableOpacity onPress={() => setText("")} style={styles.clearBtn}>
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 件数ラベル */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{loading ? "Loading..." : countLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchWrap: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  search: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  clearBtn: {
    marginLeft: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { fontSize: 18, fontWeight: "800" },

  badge: {
    position: "absolute",
    top: 62,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    zIndex: 10,
  },
  badgeText: { fontWeight: "700" },
});