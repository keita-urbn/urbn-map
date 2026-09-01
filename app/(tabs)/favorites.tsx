import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import PremiumUpsellModal from "../../components/PremiumUpsellModal";
import { ShopCard, shopMeta } from "../../components/ui/ShopCard";
import { useAuth } from "../../context/auth";
import { useShops } from "../../hooks/useShops";
import { useFavorites } from "../../lib/favorites";
import { useTheme } from "../../theme";
import type { ShopDoc } from "../../types/shop";

const MAX_PREVIEW = 10;
const RANKING_LIMIT = 5;
const CARD_GAP = 14;
const CARD_WIDTH = Math.round(Dimensions.get("window").width * 0.82);
const RANK_CARD_WIDTH = Math.round(Dimensions.get("window").width * 0.57);
type RankingKind = "favorites" | "routes" | "rating";

function metricValue(shop: ShopDoc, kind: RankingKind) {
  if (kind === "favorites") return shop.favoriteCount ?? 0;
  if (kind === "routes") return shop.routeClickCount ?? 0;
  return shop.ratingAverage ?? 0;
}

function hasData(shop: ShopDoc, kind: RankingKind) {
  return kind === "rating" ? (shop.ratingCount ?? 0) > 0 : metricValue(shop, kind) > 0;
}

// One seed per screen session provides a stable cold-start shuffle.
function stableRandomScore(id: string, seed: number, salt: number) {
  let value = seed ^ salt;
  for (let i = 0; i < id.length; i += 1) value = Math.imul(value ^ id.charCodeAt(i), 16777619);
  return value >>> 0;
}

function rankedShops(shops: ShopDoc[], kind: RankingKind, seed: number) {
  // Beta behavior: use real ranking as soon as a single measurable action
  // exists. This condition is intentionally isolated here so production can
  // later introduce a higher confidence threshold without changing the UI.
  const meaningful = shops.some((shop) => hasData(shop, kind));
  const result = [...shops];
  if (meaningful) {
    result.sort((a, b) => {
      const difference = metricValue(b, kind) - metricValue(a, kind);
      if (difference !== 0) return difference;
      return kind === "rating" ? (b.ratingCount ?? 0) - (a.ratingCount ?? 0) : 0;
    });
  } else {
    const salt = kind === "favorites" ? 11 : kind === "routes" ? 29 : 47;
    result.sort((a, b) => stableRandomScore(a.id, seed, salt) - stableRandomScore(b.id, seed, salt));
  }
  return result.slice(0, RANKING_LIMIT);
}

function RankingSection({ title, kind, shops, seed }: { title: string; kind: RankingKind; shops: ShopDoc[]; seed: number }) {
  const router = useRouter();
  const { colors } = useTheme();
  const data = useMemo(() => rankedShops(shops, kind, seed), [shops, kind, seed]);
  return (
    <View style={styles.rankingSection}>
      <Text style={[styles.rankingTitle, { color: colors.text }]}>{title}</Text>
      <FlatList
        data={data}
        horizontal
        keyExtractor={(item) => `${kind}-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rankingList}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push(`/shop/${item.id}`)}
            style={({ pressed }) => [styles.rankCard, { backgroundColor: colors.card ?? colors.surface, borderColor: colors.border }, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.rankImageWrap}>
              {item.imageUrl?.trim() ? <Image source={{ uri: item.imageUrl }} style={styles.rankImage} resizeMode="cover" /> : (
                <View style={[styles.rankImage, styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="storefront-outline" size={28} color={colors.muted} />
                </View>
              )}
              <View style={styles.rankBadge}><Text style={styles.rankBadgeText}>#{index + 1}</Text></View>
            </View>
            <Text numberOfLines={1} style={[styles.rankName, { color: colors.text }]}>{item.name}</Text>
            <Text numberOfLines={1} style={[styles.rankMeta, { color: colors.muted }]}>{shopMeta(item) || "ショップ"}</Text>
            <View style={styles.metricRow}>
              <Ionicons name={kind === "favorites" ? "heart" : kind === "routes" ? "navigate" : "star"} size={15} color={kind === "favorites" ? "#ff5b76" : kind === "routes" ? "#60a5fa" : "#fbbf24"} />
              <Text style={[styles.metricText, { color: colors.text }]}>
                {kind === "rating" ? `${(item.ratingAverage ?? 0).toFixed(1)} (${item.ratingCount ?? 0})` : metricValue(item, kind).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading: authLoading, isPremium } = useAuth();
  const { shops = [], loading, error: shopsError, refresh } = useShops();
  const { favoriteIds, isFavorite, toggle, loading: favLoading } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  const [upsellVisible, setUpsellVisible] = useState(false);
  const sessionSeed = useRef(Math.floor(Math.random() * 0x7fffffff)).current;
  const favoriteShops = useMemo(() => shops.filter((shop) => favoriteIds.includes(shop.id)), [shops, favoriteIds]);
  const previewShops = useMemo(() => favoriteShops.slice(0, MAX_PREVIEW), [favoriteShops]);

  const doRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await refresh?.(); } finally { setRefreshing(false); }
  }, [refresh, refreshing]);

  const waitingForFavorites = authLoading || Boolean(user && (favLoading || loading));
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.text} colors={[colors.text]} />} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>お気に入り</Text>
          {favoriteShops.length > 0 && <Pressable onPress={() => router.push("/favorites/list" as any)} style={[styles.navBtn, { borderColor: colors.border }]}><Text style={[styles.navBtnText, { color: colors.text }]}>一覧 ›</Text></Pressable>}
        </View>

        {previewShops.length > 0 ? (
          <FlatList data={previewShops} horizontal keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} snapToInterval={CARD_WIDTH + CARD_GAP} decelerationRate="fast" contentContainerStyle={styles.favoriteList} renderItem={({ item }) => (
            <ShopCard item={item} isFavorite={isFavorite} toggle={toggle} isPremium={isPremium} onFavoriteLimit={() => setUpsellVisible(true)} style={styles.favoriteCard} />
          )} />
        ) : (
          <View style={[styles.emptyContainer, { borderColor: colors.border, backgroundColor: colors.card ?? colors.surface }]}>
            <Ionicons name="heart-outline" size={30} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{waitingForFavorites ? "読み込み中..." : "お気に入りはまだありません"}</Text>
            {!waitingForFavorites && <Text style={[styles.emptyDescription, { color: colors.muted }]}>{user ? "気になる店舗の♡を押すと、ここに表示されます。" : "ログイン後、♡を押した店舗がここに表示されます。"}</Text>}
          </View>
        )}

        {!!shopsError && shops.length === 0 && (
          <View style={styles.shopError}>
            <Text style={[styles.shopErrorText, { color: colors.muted }]}>ショップを読み込めませんでした</Text>
            <Pressable onPress={() => void doRefresh()} style={[styles.retryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.retryText, { color: colors.text }]}>再読み込み</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.discoveryTitle, { color: colors.text }]}>今人気のショップ</Text>
        <RankingSection title="お気に入りが多い" kind="favorites" shops={shops} seed={sessionSeed} />
        <RankingSection title="経路案内が多い" kind="routes" shops={shops} seed={sessionSeed} />
        <RankingSection title="高評価" kind="rating" shops={shops} seed={sessionSeed} />
      </ScrollView>
      <PremiumUpsellModal visible={upsellVisible} message={"フリープランでお気に入りに登録できるのは3店舗までです。\nPremiumプランにアップグレードすると無制限でお気に入りを保存できます。"} onClose={() => setUpsellVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { paddingTop: 16, paddingBottom: 36 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, marginBottom: 14 },
  sectionTitle: { fontSize: 22, fontWeight: "900" },
  navBtn: { height: 34, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" }, navBtnText: { fontWeight: "700", fontSize: 16 },
  favoriteList: { paddingHorizontal: 18, paddingBottom: 8 }, favoriteCard: { width: CARD_WIDTH, marginRight: CARD_GAP },
  emptyContainer: { marginHorizontal: 18, borderWidth: 1, borderRadius: 18, paddingHorizontal: 22, paddingVertical: 30, alignItems: "center" },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "900", textAlign: "center" }, emptyDescription: { marginTop: 7, fontSize: 13, fontWeight: "600", lineHeight: 20, textAlign: "center" },
  shopError: { alignItems: "center", gap: 9, marginTop: 16, paddingHorizontal: 18 }, shopErrorText: { fontSize: 13, fontWeight: "700" },
  retryBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }, retryText: { fontSize: 13, fontWeight: "800" },
  discoveryTitle: { marginTop: 30, marginBottom: 4, paddingHorizontal: 18, fontSize: 22, fontWeight: "900" }, rankingSection: { marginTop: 22 },
  rankingTitle: { paddingHorizontal: 18, marginBottom: 11, fontSize: 17, fontWeight: "900" }, rankingList: { paddingHorizontal: 18 },
  rankCard: { width: RANK_CARD_WIDTH, marginRight: 12, borderWidth: 1, borderRadius: 16, padding: 10 }, rankImageWrap: { position: "relative" }, rankImage: { width: "100%", height: 92, borderRadius: 11 }, imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  rankBadge: { position: "absolute", left: 7, top: 7, backgroundColor: "rgba(0,0,0,0.78)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 }, rankBadgeText: { color: "white", fontSize: 12, fontWeight: "900" },
  rankName: { marginTop: 9, fontSize: 15, fontWeight: "900" }, rankMeta: { marginTop: 3, fontSize: 11, fontWeight: "700" }, metricRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }, metricText: { fontSize: 13, fontWeight: "900" },
});
