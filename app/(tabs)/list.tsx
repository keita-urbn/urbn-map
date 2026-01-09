// app/(tabs)/list.tsx
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

import { useShops } from "../../hooks/useShops";
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
    Array.isArray((s as any).brands) ? (s as any).brands.join(",") : (s as any).brands,
    (s as any).address,
  ]
    .filter(Boolean)
    .map((x) => normalize(String(x)))
    .join(" ");

  return hay.includes(t);
}

export default function ListScreen() {
  const router = useRouter();
  // useShops が refresh/refetch を返してても返してなくても動くように any で受ける
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
      const fn = typeof refresh === "function" ? refresh : typeof refetch === "function" ? refetch : null;
      if (fn) {
        await fn();
      } else {
        // フォールバック：再マウントで取り直し（useShops 内の購読/取得が走る想定）
        router.replace("/(tabs)/list");
      }
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refetch, router, refreshing]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* タイトル行 */}
      <View style={styles.topRow}>
        <Text style={styles.topTitle}>List</Text>

        {/* 右上アクション群（更新 + 追加） */}
        <View style={styles.actionsRight}>
          <Pressable
            onPress={doRefresh}
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.refreshBtnText}>更新</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/admin/add-shop")}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.addBtnText}>＋ 店舗追加</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>ショップ一覧</Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="店名・エリア・カテゴリ・ブランドなどで検索"
        placeholderTextColor="#aaa"
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.countText}>
        {filtered.length} 件 / {(shops ?? []).length} 件
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String((item as any).id ?? item.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
        renderItem={({ item }) => {
          const id = String((item as any).id ?? item.id);
          const area = (item as any).area ? String((item as any).area) : "エリア未設定";

          return (
            <View style={styles.card}>
              <Text style={styles.name}>{(item as any).name ?? "Shop"}</Text>
              <Text style={styles.area}>{area}</Text>

              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => router.push(`/shop/${id}`)}
                  style={({ pressed }) => [styles.btnOutline, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.btnOutlineText}>詳細</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/admin/edit-shop/${id}`)}
                  style={({ pressed }) => [styles.btnSolid, pressed && { opacity: 0.8 }]}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 18, paddingTop: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  topRow: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  topTitle: { fontSize: 18, fontWeight: "700", color: "#111" },

  actionsRight: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  refreshBtn: {
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtnText: { color: "#111", fontWeight: "700" },

  addBtn: {
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#111", fontWeight: "700" },

  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginTop: 6, marginBottom: 10 },

  search: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111",
  },
  countText: { marginTop: 10, marginBottom: 12, color: "#666", fontWeight: "600" },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
    backgroundColor: "#fff",
  },
  name: { fontSize: 20, fontWeight: "900", color: "#111" },
  area: { marginTop: 6, color: "#777", fontWeight: "700" },

  btnRow: { marginTop: 14, flexDirection: "row", gap: 10 },

  btnOutline: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#111",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: { color: "#111", fontWeight: "800" },

  btnSolid: {
    height: 42,
    borderRadius: 14,
    backgroundColor: "#111",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSolidText: { color: "#fff", fontWeight: "900" },
});
