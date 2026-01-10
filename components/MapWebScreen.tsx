// components/MapWebScreen.tsx
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useShops } from "../hooks/useShops";
import { openGoogleMapsDirections } from "../lib/openMaps";
import type { ShopDoc } from "../types/shop";
import ShopMapWeb from "./ShopMap.web";

const PH = "#9CA3AF";

function normalize(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

export default function MapWebScreen() {
  const { shops, loading } = useShops();

  const [text, setText] = useState("");
  const [selected, setSelected] = useState<ShopDoc | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(text);
    if (!q) return (shops ?? []) as ShopDoc[];

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
        .join(" ");
      return normalize(hay).includes(q);
    }) as ShopDoc[];
  }, [shops, text]);

  const countLabel = useMemo(() => {
    if (text.trim()) return `検索中：${filtered.length}件`;
    return `全件表示：${filtered.length}件`;
  }, [filtered.length, text]);

  const goDetail = (shop: ShopDoc) => {
    const id = String((shop as any).id ?? "");
    if (!id) return;
    router.push(`/shop/${id}` as any);
  };

  const goDirections = (shop: ShopDoc) => {
    const lat = Number((shop as any).lat);
    const lng = Number((shop as any).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    openGoogleMapsDirections({ lat, lng }, String((shop as any).name ?? ""), "walking");
  };

  return (
    <View style={styles.container}>
      {/* 地図（ピン押し＝選択だけ。遷移はカード側） */}
      <ShopMapWeb
        shops={filtered}
        selectedId={selected ? String((selected as any).id) : null}
        onSelect={(shop) => setSelected(shop)}
        onMapClick={() => setSelected(null)}
      />

      {/* 検索バー */}
      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="渋谷 / 中目黒 / ブランド古着 ... で絞り込み"
          placeholderTextColor={PH}
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

      {/* 下のショップカード（ピン→カード） */}
      {selected && (
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{String((selected as any).name ?? "")}</Text>

            {/* サブ情報（あれば） */}
            <Text style={styles.cardMeta}>
              {[
                (selected as any).area ? `📍 ${(selected as any).area}` : "",
                (selected as any).genre ? `🏷 ${(selected as any).genre}` : "",
              ]
                .filter(Boolean)
                .join("   ")}
            </Text>

            <TouchableOpacity onPress={() => goDetail(selected)} style={styles.cardLink}>
              <Text style={styles.cardLinkText}>▶ 詳細を見る</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => goDirections(selected)} style={styles.cardNav}>
              <Text style={styles.cardNavText}>経路案内</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelected(null)} style={styles.cardClose}>
              <Text style={styles.cardCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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

  // 下カード
  cardWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    zIndex: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  cardTitle: { fontSize: 20, fontWeight: "900" },
  cardMeta: { marginTop: 6, color: "#6B7280", fontWeight: "700" },

  cardLink: { marginTop: 10, paddingVertical: 6 },
  cardLinkText: { color: "#1d4ed8", fontWeight: "900" },

  cardNav: {
    marginTop: 10,
    backgroundColor: "black",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cardNavText: { color: "white", fontWeight: "900" },

  cardClose: { marginTop: 10, alignItems: "flex-end" },
  cardCloseText: { color: "#6B7280", fontWeight: "800" },
});