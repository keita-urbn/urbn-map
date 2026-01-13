// app/(tabs)/index.tsx
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Region } from "react-native-maps";

import ShopMap from "../../components/ShopMap";
import { useShops } from "../../hooks/useShops";
import { openGoogleMapsDirections } from "../../lib/openMaps";
import { useTheme } from "../../theme";
import type { ShopDoc } from "../../types/shop";

function normalize(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

function pickColor(colors: any, keys: string[], fallback: string) {
  for (const k of keys) {
    if (colors?.[k]) return colors[k];
  }
  return fallback;
}

export default function MapScreen() {
  const { shops, loading } = useShops();
  const { colors } = (useTheme() as any) ?? {};

  // よくある命名揺れを吸収して「確実に効く」ようにする
  const BG = pickColor(colors, ["bg", "background"], "#fff");
  const CARD = pickColor(colors, ["card", "surface"], "#fff");
  const TEXT = pickColor(colors, ["text"], "#111");
  const BORDER = pickColor(colors, ["border"], "#e5e7eb");
  const MUTED = pickColor(colors, ["muted", "subtext", "placeholder"], "#9ca3af");
  const CHIP = pickColor(colors, ["chip", "chipBg", "mutedBg"], "#d1d5db");
  const CHIP_TEXT = pickColor(colors, ["mutedText", "subtext", "placeholder"], "#374151");

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

  const clearSearch = useCallback(() => {
    setText("");
    setSelected(null);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* 検索バー（地図内） */}
      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSelected(null);
          }}
          placeholder="店名・エリア・カテゴリ・ブランド ...で絞り込み"
          placeholderTextColor={MUTED}
          style={[
            styles.search,
            { backgroundColor: CARD, borderColor: BORDER, color: TEXT },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {text.length > 0 && (
          <Pressable
            onPress={clearSearch}
            style={({ pressed }) => [
              styles.clearBtn,
              { backgroundColor: CHIP },
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={10}
          >
            <Text style={[styles.clearText, { color: CHIP_TEXT }]}>×</Text>
          </Pressable>
        )}
      </View>

      {/* 件数バッジ */}
      <View style={[styles.badge, { backgroundColor: CARD, borderColor: BORDER }]}>
        <Text style={[styles.badgeText, { color: TEXT }]}>
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
    justifyContent: "center",
  },

  search: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 44, // 右端×の分
    borderWidth: 1,
  },

  clearBtn: {
    position: "absolute",
    right: 12,
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  clearText: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },

  badge: {
    position: "absolute",
    top: 62,
    left: 10,
    zIndex: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },

  badgeText: { fontWeight: "800" },
});