// app/(tabs)/explore.tsx
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import InfoCategoryCard from "../../components/InfoCategoryCard";
import { db, isFirebaseConfigured } from "../../lib/firebase";
import { useTheme } from "../../theme";

const CATEGORIES = [
  { key: "shop",  label: "店舗情報",   collection: "info_shop" },
  { key: "event", label: "イベント情報", collection: "info_event" },
  { key: "size",  label: "アイテムサイズ詳細",  collection: "info_size" },
  { key: "trend", label: "トレンド情報", collection: "info_trend" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];
type Previews = Partial<Record<CategoryKey, string>>;

async function fetchPreviews(): Promise<Previews> {
  if (!isFirebaseConfigured || !db) return {};
  const results = await Promise.all(
    CATEGORIES.map(async (cat) => {
      try {
        const snap = await getDocs(
          query(
            collection(db, cat.collection),
            orderBy("createdAt", "desc"),
            limit(1)
          )
        );
        const text = snap.docs[0]?.data()?.text as string | undefined;
        return [cat.key, text ? text.slice(0, 40) : undefined] as const;
      } catch {
        return [cat.key, undefined] as const;
      }
    })
  );
  return Object.fromEntries(
    results.filter(([, v]) => v !== undefined)
  ) as Previews;
}

type Category = (typeof CATEGORIES)[number];

export default function ExploreScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [previews, setPreviews] = useState<Previews>({});

  const doRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const next = await fetchPreviews();
      setPreviews(next);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  // container + sectionTitle match list.tsx exactly
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: 18,
          paddingTop: 10,
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: "900",
          color: colors.text,
          marginTop: 6,
          marginBottom: 10,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>チャット一覧</Text>
      <FlatList<Category>
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
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
          <InfoCategoryCard
            title={item.label}
            subtitle={previews[item.key]}
            onPressView={() =>
              router.push({
                pathname: "/info/[type]",
                params: { type: item.key },
              } as any)
            }
          />
        )}
      />
    </View>
  );
}

