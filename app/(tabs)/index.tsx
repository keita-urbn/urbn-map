import NotificationBell from "../../components/NotificationBell";
import { useBusinessClock } from "../../hooks/useBusinessClock";
import { getOpeningStatus } from "../../lib/businessHours";
// app/(tabs)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMapOverlay } from "../../context/mapOverlay";
import ShopSheet from "../../components/ShopSheet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Region } from "react-native-maps";

import PremiumUpsellModal from "../../components/PremiumUpsellModal";
import ShopMap from "../../components/ShopMap";
import { useAuth } from "../../context/auth";
import { useRouteGuard } from "../../hooks/useRouteGuard";
import { useShops } from "../../hooks/useShops";
import { useFavorites } from "../../lib/favorites";
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
  const { shops } = useShops();
  const insets = useSafeAreaInsets();
  const { setSheetOpen } = useMapOverlay();
  const { colors } = (useTheme() as any) ?? {};
  const { isPremium } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const {
    guardedShopDirections,
    upsellVisible,
    upsellMessage,
    dismissUpsell,
  } = useRouteGuard();

  const [favUpsellVisible, setFavUpsellVisible] = useState(false);

  const handleToggleFavorite = useCallback(
    async (shopId: string) => {
      const result = await toggle(shopId, isPremium);
      if (result?.reason === "limit_reached") {
        setFavUpsellVisible(true);
      }
      return result;
    },
    [toggle, isPremium],
  );

  // よくある命名揺れを吸収して「確実に効く」ようにする
  const BG = pickColor(colors, ["bg", "background"], "#fff");
  const CARD = pickColor(colors, ["card", "surface"], "#fff");
  const TEXT = pickColor(colors, ["text"], "#111");
  const BORDER = pickColor(colors, ["border"], "#e5e7eb");
  const MUTED = pickColor(colors, ["muted", "subtext", "placeholder"], "#9ca3af");
  const CHIP = pickColor(colors, ["chip", "chipBg", "mutedBg"], "#d1d5db");
  const CHIP_TEXT = pickColor(colors, ["mutedText", "subtext", "placeholder"], "#374151");

  const now = useBusinessClock();
  const [openNow, setOpenNow] = useState(false);
  const statusById = useMemo(() => Object.fromEntries(shops.map(shop => [shop.id, getOpeningStatus(shop.businessHours, now)])), [shops, now]);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<ShopDoc | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(text);
    return (shops ?? []).filter((s: any) => {
      const hay = [s?.name, s?.area, s?.genre, s?.address, s?.brands]
        .filter(Boolean)
        .map(normalize)
        .join(" ");
      return hay.includes(q) && (!openNow || statusById[s.id] === "open");
    }) as ShopDoc[];
  }, [shops, text, openNow, statusById]);

  const visibleSelected = selected ? filtered.find(shop => shop.id === selected.id) ?? null : null;
  useEffect(() => { setSheetOpen(!!visibleSelected); return () => setSheetOpen(false); }, [visibleSelected, setSheetOpen]);

  const initialRegion: Region = {
    latitude: 35.681236,
    longitude: 139.767125,
    latitudeDelta: 0.18,
    longitudeDelta: 0.18,
  };

  const onOpenDirections = useCallback((shop: ShopDoc) => {
    guardedShopDirections(shop);
  }, [guardedShopDirections]);

  const clearSearch = useCallback(() => {
    setText("");
    setSelected(null);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* 検索バー（地図内） */}
      <View style={[styles.topOverlay, { top: insets.top + 12, left: insets.left + 16, right: insets.right + 16 }]} pointerEvents="box-none">
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={21} color={MUTED} style={{ position: "absolute", left: 18, zIndex: 1 }} />
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
        <View pointerEvents="box-none" style={styles.controls}>
          <NotificationBell style={[styles.notification, { backgroundColor: CARD, borderColor: BORDER }]} />
          <Pressable accessibilityRole="switch" accessibilityLabel="営業中のみ表示" accessibilityState={{ checked: openNow }} onPress={() => { Keyboard.dismiss(); setOpenNow(!openNow); setSelected(null); }} style={[styles.openNow, { backgroundColor: openNow ? "#22c55e24" : CHIP, borderColor: openNow ? "#22c55e" : BORDER }]}><Ionicons name={openNow ? "checkmark-circle" : "checkmark-circle-outline"} size={21} color={openNow ? "#22c55e" : MUTED} /><Text style={{ color: openNow ? "#22c55e" : MUTED, fontSize: 9, fontWeight: "700" }}>営業中</Text></Pressable>
        </View>
      </View>

      <ShopMap
        shops={filtered}
        priorityShops={shops}
        initialRegion={initialRegion}
        selected={visibleSelected}
        statusById={statusById}
        onSelect={(shop) => { Keyboard.dismiss(); setSelected(shop); }}
      />

      {visibleSelected && <ShopSheet shop={visibleSelected} relatedCandidates={shops} onSelectRelated={shop => { setText(""); setOpenNow(false); setSelected(shop); }} onClose={() => setSelected(null)} onDirections={() => onOpenDirections(visibleSelected)} saved={isFavorite(visibleSelected.id)} onToggle={() => handleToggleFavorite(visibleSelected.id)} />}

      <PremiumUpsellModal
        visible={upsellVisible}
        message={upsellMessage}
        onClose={dismissUpsell}
      />
      <PremiumUpsellModal
        visible={favUpsellVisible}
        message={"フリープランでお気に入りに登録できるのは3店舗までです。\nPremiumプランにアップグレードすると無制限でお気に入りを保存できます。"}
        onClose={() => setFavUpsellVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topOverlay: { position: "absolute", zIndex: 1100 },
  controls: { alignSelf: "flex-end", alignItems: "center", gap: 12, marginTop: 12 },
  notification: { width: 54, height: 44, marginLeft: 0, borderRadius: 20, borderWidth: 1 },
  searchWrap: {
    justifyContent: "center",
  },

  search: {
    borderRadius: 28,
    paddingVertical: 12,
    paddingLeft: 48,
    paddingRight: 56, // 右端×の分
    borderWidth: 1,
  },

  openNow: { width: 54, minHeight: 44, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  clearBtn: {
    position: "absolute",
    right: 16,
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

});
