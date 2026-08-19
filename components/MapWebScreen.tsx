// components/MapWebScreen.tsx
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import PremiumUpsellModal from "./PremiumUpsellModal";

import { useRouteGuard } from "../hooks/useRouteGuard";
import { useShops } from "../hooks/useShops";
import { useFavorites } from "../lib/favorites";
import { useTheme } from "../theme"; // ✅ 統一
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
  const { colors, isDark } = useTheme();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const {
    guardedShopDirections,
    upsellVisible,
    upsellMessage,
    dismissUpsell,
  } = useRouteGuard();

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
    guardedShopDirections(shop);
  }, [guardedShopDirections]);

  const clearSearch = useCallback(() => {
    setText("");
    setSelectedId(null);
  }, []);

  const CARD = colors.card ?? colors.surface ?? colors.background;
  const BORDER = colors.border;
  const MUTED = colors.muted ?? "#9ca3af";
  const CHIP = colors.pill ?? (isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* 検索バー（地図内） */}
      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSelectedId(null);
          }}
          placeholder="渋谷 / 中目黒 / ブランド古着 ...で絞り込み"
          placeholderTextColor={MUTED}
          style={[
            styles.search,
            { backgroundColor: CARD, borderColor: BORDER, color: colors.text },
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
            <Text style={[styles.clearText, { color: colors.text }]}>×</Text>
          </Pressable>
        )}
      </View>

      {/* 件数バッジ */}
      <View style={[styles.badge, { backgroundColor: CARD, borderColor: BORDER }]}>
        <Text style={[styles.badgeText, { color: colors.text }]}>
          {loading ? "読み込み中..." : `全件表示：${filtered.length}件`}
        </Text>
      </View>

      <ShopMapWeb
        shops={filtered}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onOpenDetail={onOpenDetail}
        onOpenDirections={onOpenDirections}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
      />

      <PremiumUpsellModal
        visible={upsellVisible}
        message={upsellMessage}
        onClose={dismissUpsell}
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
    zIndex: 1000,
    justifyContent: "center",
  },

  search: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 44,
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
    fontWeight: "900",
    lineHeight: 20,
  },

  badge: {
    position: "absolute",
    top: 62,
    left: 10,
    zIndex: 1000,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },

  badgeText: { fontWeight: "900" },
});