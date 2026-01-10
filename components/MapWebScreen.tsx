// components/MapWebScreen.tsx
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useShops } from "../hooks/useShops";
import { openGoogleMapsDirections } from "../lib/openMaps";
import type { ShopDoc } from "../types/shop";
import ShopMapWeb from "./ShopMap.web";

function normalize(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

function getShopId(shop: ShopDoc) {
  return String((shop as any)?.id ?? (shop as any)?.docId ?? "");
}

export default function MapWebScreen() {
  const { shops, loading } = useShops();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<ShopDoc | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(text);
    const list = (shops ?? []) as ShopDoc[];
    if (!q) return list;

    return list.filter((s: any) => {
      const hay = [s?.name, s?.area, s?.genre, s?.address, s?.brands]
        .filter(Boolean)
        .map(normalize)
        .join(" ");
      return hay.includes(q);
    });
  }, [shops, text]);

  const onSelect = useCallback((shop: ShopDoc) => {
    setSelected(shop);
  }, []);

  const onMapClick = useCallback(() => {
    setSelected(null);
  }, []);

  const onOpenDetail = useCallback((shop: ShopDoc) => {
    const id = getShopId(shop);
    if (!id) return;
    router.push(`/shop/${id}`);
  }, []);

  const onOpenDirections = useCallback((shop: ShopDoc) => {
    openGoogleMapsDirections(shop);
  }, []);

  return (
    <View style={styles.root}>
      {/* 検索 */}
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

      {/* 件数 */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {loading ? "読み込み中..." : `全件表示：${filtered.length}件`}
        </Text>
      </View>

      {/* 地図 */}
      <ShopMapWeb shops={filtered} onSelect={onSelect} onMapClick={onMapClick} />

      {/* 浮いたカード（アプリ寄せ） */}
      {selected ? (
        <View style={styles.cardWrap} pointerEvents="box-none">
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.title}>{(selected as any)?.name ?? ""}</Text>

            <Pressable onPress={() => onOpenDetail(selected)} hitSlop={8} style={styles.detailRow}>
              <Text style={styles.detailLink}>詳細を見る</Text>
            </Pressable>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onOpenDirections(selected)}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>経路案内</Text>
            </TouchableOpacity>

            <Pressable onPress={() => setSelected(null)} hitSlop={8} style={styles.close}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  badgeText: { fontWeight: "800" },

  // ✅ ここが「2枚目 → 1枚目」寄せの肝：でかい下パネルじゃなく“浮いたカード”
  cardWrap: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 12,
    zIndex: 9999,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520, // ← でかい板にならない
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 14,

    // Webで“浮いてる感”を出す
    boxShadow: "0px 10px 28px rgba(0,0,0,0.18)" as any,
  },

  title: { fontSize: 18, fontWeight: "900", marginBottom: 6 },

  detailRow: { paddingVertical: 2, alignSelf: "flex-start" },
  detailLink: { color: "#1d4ed8", fontWeight: "900" },

  navBtn: {
    marginTop: 10,
    backgroundColor: "black",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  navBtnText: { color: "white", fontWeight: "900" },

  close: { alignSelf: "flex-end", marginTop: 10 },
  closeText: { color: "#6b7280", fontWeight: "800" },
});