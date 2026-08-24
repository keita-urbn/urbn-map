// app/posts/index.tsx
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

import PostCard from "../../components/ui/PostCard";
import { useAuth } from "../../context/auth";
import { usePosts } from "../../hooks/usePosts";
import { deletePost } from "../../lib/posts";
import { useTheme } from "../../theme";

export default function PostsListScreen() {
  const { colors } = useTheme();
  const { user, isAdmin, isPremium } = useAuth();
  const { posts, loading, refresh } = usePosts();
  const [refreshing, setRefreshing] = useState(false);

  const doRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refreshing]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("削除確認", "この記事を削除しますか？", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost(id);
            } catch (e: any) {
              Alert.alert("削除失敗", String(e?.message ?? e));
            }
          },
        },
      ]);
    },
    [],
  );

  const handlePremiumCTA = useCallback(() => {
    if (user) router.push("/premium");
    else router.push({ pathname: "/login", params: { returnTo: "/premium" } });
  }, [user]);

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
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>記事</Text>

      {posts.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>まだ記事がありません</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
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
            <PostCard
              post={item}
              isPremium={isPremium}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onPremiumCTA={handlePremiumCTA}
              premiumCtaLabel={user ? "Premiumでアンロック" : "ログインしてPremiumになる"}
            />
          )}
        />
      )}
    </View>
  );
}
