// app/(tabs)/list.tsx
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
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

import { useShops } from "../../hooks/useShops";
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

// 🔑 map / web / native で共通の表示仕様
function shopMeta(item: ShopDoc) {
  const area = ((item as any).area ?? "").toString().trim();
  const genre = ((item as any).genre ?? "").toString().trim();
  return [area, genre].filter(Boolean).join(" ・ ");
}

export default function ListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  const { shops, loading, refresh, refetch } = (useShops() as any) ?? {};
  const [text, setText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
      headerRight: () => (
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
      ),
    });
  }, [navigation, router, doRefresh, styles]);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={doRefresh} />
        }
        renderItem={({ item }) => {
          const id = String((item as any).id ?? item.id);
          const meta = shopMeta(item);

          return (
            <View style={styles.card}>
              <Text style={styles.name}>{(item as any).name ?? "Shop"}</Text>
              {!!meta && <Text style={styles.meta}>{meta}</Text>}

              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => router.push(`/shop/${id}`)}
                  style={({ pressed }) => [
                    styles.btnOutline,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.btnOutlineText}>詳細</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/admin/edit-shop/${id}`)}
                  style={({ pressed }) => [
                    styles.btnSolid,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.btnSolidText}>編集</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}