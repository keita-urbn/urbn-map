// app/(tabs)/favorites.tsx
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PremiumUpsellModal from "../../components/PremiumUpsellModal";
import { ShopCard } from "../../components/ui/ShopCard";
import { useAuth } from "../../context/auth";
import { useShops } from "../../hooks/useShops";
import { useFavorites } from "../../lib/favorites";
import { useTheme } from "../../theme";
import type { ShopDoc } from "../../types/shop";

const MAX_PREVIEW = 10;
const CARD_GAP = 14;
const CARD_WIDTH = Math.round(Dimensions.get("window").width * 0.82);
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useAuth();
  const { shops, loading, refresh, refetch } = (useShops() as any) ?? {};
  const { favoriteIds, isFavorite, toggle, loading: favLoading } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  const [upsellVisible, setUpsellVisible] = useState(false);

  const favoriteShops = useMemo(
    () => (shops ?? []).filter((s: ShopDoc) => favoriteIds.includes(s.id)),
    [shops, favoriteIds],
  );

  /** Show at most MAX_PREVIEW cards in the carousel */
  const previewShops = useMemo(
    () => favoriteShops.slice(0, MAX_PREVIEW),
    [favoriteShops],
  );

  const doRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const fn =
        typeof refresh === "function"
          ? refresh
          : typeof refetch === "function"
            ? refetch
            : null;
      if (fn) await fn();
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refetch, refreshing]);

  const styles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 10,
      },
      headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 6,
        marginBottom: 14,
        paddingHorizontal: 18,
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: colors.text,
      },
      navBtn: {
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
      },
      navBtnText: {
        color: colors.text,
        fontWeight: "700",
        fontSize: 16,
      },
      emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
      },
      emptyText: {
        color: colors.muted,
        fontSize: 14,
        fontWeight: "700",
      },
      carouselCard: {
        width: CARD_WIDTH,
        marginRight: CARD_GAP,
      },
    });
  }, [colors]);

  return (
    <View style={styles.container}>
      {/* ── Header row ── */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>お気に入り</Text>
        <Pressable
          onPress={() => router.push("/favorites/list" as any)}
          style={({ pressed }) => [
            styles.navBtn,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={10}
        >
          <Text style={styles.navBtnText}>一覧 ›</Text>
        </Pressable>
      </View>

      {/* ── Horizontal carousel of favorite shops ── */}
      {previewShops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {favLoading || loading
              ? "読み込み中..."
              : "お気に入りはまだありません"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={previewShops}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={SNAP_INTERVAL}
          decelerationRate="fast"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20, alignItems: "flex-start" }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={doRefresh}
              tintColor={colors.text}
              colors={[colors.text]}
            />
          }
          renderItem={({ item }) => (
            <ShopCard
              item={item}
              isFavorite={isFavorite}
              toggle={toggle}
              isPremium={isPremium}
              onFavoriteLimit={() => setUpsellVisible(true)}
              style={styles.carouselCard}
            />
          )}
        />
      )}
      <PremiumUpsellModal
        visible={upsellVisible}
        message="フリープランでお気に入りに登録できるのは3店舗までです。\nPremiumプランにアップグレードすると無制限でお気に入りを保存できます。"
        onClose={() => setUpsellVisible(false)}
      />
    </View>
  );
}