// app/(tabs)/list.tsx
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
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
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useTheme } from "../../theme"; // ✅統一
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

function RevealCard({ revealed, index, children }: { revealed: boolean; index: number; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(revealed || reduceMotion ? 1 : 0)).current;
  const translateX = useRef(new Animated.Value(revealed || reduceMotion ? 0 : -28)).current;

  useEffect(() => {
    if (!revealed) return;
    if (reduceMotion) {
      opacity.setValue(1);
      translateX.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay: (index % 3) * 24,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        delay: (index % 3) * 24,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, reduceMotion, revealed, translateX]);

  return <Animated.View style={{ opacity, transform: [{ translateX }] }}>{children}</Animated.View>;
}

export default function ListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  const { isAdmin, isPremium } = useAuth();
  const { shops, loading, refresh, refetch } = (useShops() as any) ?? {};
  const { isFavorite, toggle } = useFavorites();
  const [text, setText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [upsellVisible, setUpsellVisible] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 20, minimumViewTime: 40 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { item: ShopDoc; isViewable?: boolean }[] }) => {
    setRevealedIds((previous) => {
      let changed = false;
      const next = new Set(previous);
      viewableItems.forEach(({ item, isViewable }) => {
        if (!isViewable) return;
        const id = String((item as any).id ?? item.id);
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }).current;

  const filtered = useMemo(
    () => (shops ?? []).filter((s: ShopDoc) => matchShop(s, text)),
    [shops, text]
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

      if (fn) {
        await fn();
      } else {
        router.replace("/(tabs)/list");
      }
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refetch, router, refreshing]);

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

      refreshBtn: {
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
      },
      refreshBtnText: { color: colors.text, fontWeight: "700" },

      addBtn: {
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
      },
      addBtnText: { color: colors.text, fontWeight: "700" },

      sectionTitle: {
  fontSize: 18,      // ✅ ヘッダーに合わせる
  fontWeight: "900", // ✅ 同じ太さ
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
      heartBtn: {
        position: "absolute" as const,
        top: 12,
        right: 12,
        zIndex: 2,
      },
      heartText: {
        fontSize: 22,
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

      ratingText: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: "800",
        color: colors.text,
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={doRefresh}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={10}
        >
          <Text style={styles.refreshBtnText}>更新</Text>
        </Pressable>
      ),
      headerRight: () =>
        isAdmin ? (
          <Pressable
            onPress={() => router.push("/admin/add-shop")}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={10}
          >
            <Text style={styles.addBtnText}>＋ 店舗追加</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, router, doRefresh, styles, isAdmin]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>ショップ検索</Text>

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
        {filtered.length} 件 / {(shops ?? []).length} 件
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String((item as any).id ?? item.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={doRefresh} />
        }
        renderItem={({ item, index }) => {
          const id = String((item as any).id ?? item.id);
          return (
            <RevealCard revealed={revealedIds.has(id)} index={index}>
              <ShopCard
                item={item}
                isFavorite={isFavorite}
                toggle={toggle}
                isPremium={isPremium}
                onFavoriteLimit={() => setUpsellVisible(true)}
              />
            </RevealCard>
          );
        }}
      />
      <PremiumUpsellModal
        visible={upsellVisible}
        message="フリープランでお気に入りに登録できるのは3店舗までです。\nPremiumプランにアップグレードすると無制限でお気に入りを保存できます。"
        onClose={() => setUpsellVisible(false)}
      />
    </View>
  );
}
