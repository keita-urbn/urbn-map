// app/favorites/list.tsx
// Full-list view of favorited shops — same layout & search UX as app/(tabs)/list.tsx
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import PremiumUpsellModal from "../../components/PremiumUpsellModal";
import { ShopCard } from "../../components/ui/ShopCard";
import { useAuth } from "../../context/auth";
import { useShops } from "../../hooks/useShops";
import { useFavorites } from "../../lib/favorites";
import { useTheme } from "../../theme";
import type { ShopDoc } from "../../types/shop";

function normalize(s: string) {
  return (s ?? "").toString().trim().toLowerCase();
}

function matchShop(s: ShopDoc, q: string) {
  const t = normalize(q);
  if (!t) return true;

  const hay = [
    (s as any).name,
    (s as any).area,
    (s as any).genre,
    (s as any).category,
    Array.isArray((s as any).brands)
      ? (s as any).brands.join(",")
      : (s as any).brands,
    (s as any).address,
  ]
    .filter(Boolean)
    .map((x) => normalize(String(x)))
    .join(" ");

  return hay.includes(t);
}

export default function FavoritesListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const { shops, loading, refresh, refetch } = (useShops() as any) ?? {};
  const { favoriteIds, isFavorite, toggle } = useFavorites();
  const { isPremium } = useAuth();
  const [text, setText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [upsellVisible, setUpsellVisible] = useState(false);

  const favoriteShops = useMemo(
    () => (shops ?? []).filter((s: ShopDoc) => favoriteIds.includes(s.id)),
    [shops, favoriteIds],
  );

  const filtered = useMemo(
    () => favoriteShops.filter((s: ShopDoc) => matchShop(s, text)),
    [favoriteShops, text],
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
    const cardBg = colors.card ?? colors.surface ?? colors.background;

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 18,
        paddingTop: 10,
      },
      center: { flex: 1, alignItems: "center", justifyContent: "center" },

      sectionTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: colors.text,
        marginTop: 6,
        marginBottom: 10,
      },

      searchWrap: { position: "relative", justifyContent: "center" },
      searchInput: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: cardBg,
        paddingHorizontal: 14,
        paddingRight: 40,
        fontSize: 14,
        color: colors.text,
      },
      clearBtn: {
        position: "absolute",
        right: 12,
        height: 28,
        width: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark ? "#2a2a2a" : "#e5e7eb",
      },
      clearText: {
        fontSize: 18,
        fontWeight: "800",
        color: colors.muted ?? "#6b7280",
        lineHeight: 20,
      },

      countText: {
        marginTop: 10,
        marginBottom: 12,
        color: colors.muted,
        fontWeight: "600",
      },

      card: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        backgroundColor: cardBg,
        position: "relative" as const,
      },
      name: {
        fontSize: 20,
        fontWeight: "900",
        color: colors.text,
      },
      meta: {
        marginTop: 6,
        color: colors.muted,
        fontWeight: "700",
      },
      heartBtn: {
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 2,
      },
      heartText: {
        fontSize: 22,
      },
      btnRow: {
        marginTop: 14,
        flexDirection: "row",
        gap: 10,
      },
      btnOutline: {
        height: 42,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
      },
      btnOutlineText: { color: colors.text, fontWeight: "800" },
      btnSolid: {
        height: 42,
        borderRadius: 14,
        backgroundColor: colors.text,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
      },
      btnSolidText: { color: colors.background, fontWeight: "900" },
    });
  }, [colors, isDark]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>お気に入り検索</Text>

      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="店名・エリア・ジャンル・ブランドなどで検索"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {text.length > 0 && (
          <Pressable
            onPress={() => setText("")}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={10}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.countText}>
        {filtered.length} 件 / {favoriteShops.length} 件
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
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
            />
          )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: colors.muted, fontWeight: "700" }}>
              お気に入りの店舗はまだありません
            </Text>
          </View>
        }
      />
      <PremiumUpsellModal
        visible={upsellVisible}
        message="フリープランでお気に入りに登録できるのは3店舗までです。\nPremiumプランにアップグレードすると無制限でお気に入りを保存できます。"
        onClose={() => setUpsellVisible(false)}
      />
    </View>
  );
}
