// app/shop/[id].tsx
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import PremiumUpsellModal from "../../components/PremiumUpsellModal";
import { useAuth } from "../../context/auth";
import { useReviews } from "../../hooks/useReviews";
import { useRouteGuard } from "../../hooks/useRouteGuard";
import { getShopById } from "../../hooks/useShops";
import { useFavorites } from "../../lib/favorites";
import { addReview } from "../../lib/reviews";
import { useTheme } from "../../theme";
import type { ShopDoc } from "../../types/shop";

type TravelMode = "walking" | "driving";

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text
            style={[
              styles.star,
              value >= n ? styles.starOn : styles.starOff,
            ]}
          >
            ★
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={[styles.starValue, { color: colors.text }]}>{value}/5</Text>
    </View>
  );
}

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopId = String(id ?? "");
  const { colors } = useTheme();
  const { user, isAdmin, isPremium } = useAuth();
  const { isFavorite, favoriteIds, toggle } = useFavorites();
  const {
    guardedDirections,
    guardedSearch,
    upsellVisible: routeUpsellVisible,
    upsellMessage: routeUpsellMessage,
    dismissUpsell: dismissRouteUpsell,
  } = useRouteGuard();

  const [shop, setShop] = useState<ShopDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const { reviews, reload, deleteReview } = useReviews(shopId);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [banner, setBanner] = useState("");

  // ── Favorites upsell modal state ────────────────────────────────────────────────
  const [favUpsellVisible, setFavUpsellVisible] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (msg: string) => {
    setBanner(msg);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(""), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const s = await getShopById(shopId);
        if (!s) {
          Alert.alert("見つかりません", "該当店舗がありません");
          router.back();
          return;
        }
        setShop(s);
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId]);

  /** Refresh shop doc (to pick up updated ratingAverage/ratingCount) */
  const reloadShop = async () => {
    const s = await getShopById(shopId);
    if (s) setShop(s);
  };

  if (loading || !shop) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  const lat = Number(shop.lat);
  const lng = Number(shop.lng);
  const canNav = Number.isFinite(lat) && Number.isFinite(lng);

  // ── Guarded route actions (all share one usage bucket) ────────────────────────
  const handleRouteGuidance = async (mode: TravelMode) => {
    if (!canNav) return;
    await guardedDirections(lat, lng, mode, shop.name);
  };

  const handleGoogleSearch = async () => {
    await guardedSearch(shop.name);
  };

  // ── Gated favorite toggle ────────────────────────────────────────────────────
  const handleFavoriteToggle = async () => {
    const result = await toggle(shopId, isPremium);
    if (result?.reason === "limit_reached") {
      setFavUpsellVisible(true);
    }
  };

  const postReview = async () => {
    // ① Auth guard — same dialog as Favorites
    if (!user) {
      Alert.alert("", "レビューを投稿するにはログインが必要です", [
        { text: "キャンセル", style: "cancel" },
        { text: "ログイン", onPress: () => router.push("/login") },
      ]);
      return;
    }

    if (!text.trim()) return;

    setPosting(true);
    try {
      // ② Transaction handles duplicate check + aggregation
      await addReview(shopId, { rating, text: text.trim() });
      setText("");
      setRating(5);
      await Promise.all([reload(), reloadShop()]);
    } catch (e: any) {
      if (e?.message === "ALREADY_REVIEWED") {
        showBanner("1店舗につき1件のみ投稿可能です");
      } else {
        console.error("[review] postReview error:", e?.code, e?.message);
        showBanner("投稿に失敗しました");
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
      >

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[styles.title, { color: colors.text, flex: 1 }]}>{shop.name}</Text>
        <Pressable onPress={handleFavoriteToggle} hitSlop={10}>
          <Text style={{ fontSize: 26 }}>{isFavorite(shopId) ? "❤️" : "🤍"}</Text>
        </Pressable>
      </View>

      {shop.imageUrl?.trim() ? (
        <Image source={{ uri: shop.imageUrl }} style={styles.coverImage} resizeMode="cover" />
      ) : null}

      <View
        style={[
          styles.card,
          {
            borderColor: colors.border,
            backgroundColor: colors.card ?? colors.surface,
          },
        ]}
      >
        <Row label="エリア" value={shop.area ?? "未設定"} />
        <Row label="ジャンル" value={shop.genre ?? "未設定"} />
        <Row label="住所" value={shop.address ?? "未設定"} />
        <Row label="ブランド" value={shop.brands ?? "未設定"} />
        <Row label="Instagram" value={shop.instagram ?? "未設定"} />
        <Row label="概要" value={shop.comment ?? "未設定"} />
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[
            styles.navBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
            !canNav && styles.btnDisabled,
          ]}
          disabled={!canNav}
          onPress={() => handleRouteGuidance("walking")}
        >
          <Text style={[styles.navBtnText, { color: colors.text }]}>
            徒歩で行く
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
            !canNav && styles.btnDisabled,
          ]}
          disabled={!canNav}
          onPress={() => handleRouteGuidance("driving")}
        >
          <Text style={[styles.navBtnText, { color: colors.text }]}>
            車で行く
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.subBtn,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        onPress={handleGoogleSearch}
      >
        <Text style={[styles.subBtnText, { color: colors.text }]}>
          Google Mapsで検索
        </Text>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>
          レビュー
        </Text>
        <Text style={[styles.ratingBadge, { color: colors.text }]}>
          ★ {(shop.ratingAverage ?? 0).toFixed(1)} ({shop.ratingCount ?? 0})
        </Text>
      </View>

      {(reviews ?? []).map((r: any) => (
        <View
          key={r.id}
          style={[
            styles.reviewCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.card ?? colors.surface,
            },
          ]}
        >
          <Text style={[styles.reviewMeta, { color: colors.text }]}>
            {r.rating} / 5
          </Text>
          <Text style={{ color: colors.text }}>{r.text}</Text>
          {user && r.userId === user.uid && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "削除しますか？",
                  "",
                  [
                    { text: "キャンセル", style: "cancel" },
                    {
                      text: "削除",
                      style: "destructive",
                      onPress: async () => {
                        await deleteReview(r.id);
                        await reloadShop();
                      },
                    },
                  ],
                )
              }
            >
              <Text style={styles.reviewDelete}>削除</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        レビュー投稿
      </Text>

      <Stars value={rating} onChange={setRating} />

      <TextInput
        style={[
          styles.input,
          styles.multiline,
          {
            borderColor: colors.border,
            backgroundColor: colors.card ?? colors.surface,
            color: colors.text,
          },
        ]}
        placeholder="レビューを書く"
        placeholderTextColor={colors.muted}
        value={text}
        onChangeText={setText}
        multiline
      />

      <TouchableOpacity
        style={[styles.saveBtn, posting && styles.btnDisabled]}
        disabled={posting}
        onPress={postReview}
      >
        <Text style={styles.saveBtnText}>
          {posting ? "投稿中…" : "投稿する"}
        </Text>
      </TouchableOpacity>
      </ScrollView>

      {!!banner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}

      <PremiumUpsellModal
        visible={routeUpsellVisible}
        message={routeUpsellMessage}
        onClose={dismissRouteUpsell}
      />
      <PremiumUpsellModal
        visible={favUpsellVisible}
        message="フリープランでお気に入りに登録できるのは3店舗までです。&#10;Premiumプランにアップグレードすると無制限でお気に入りを保存できます。"
        onClose={() => setFavUpsellVisible(false)}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.rowLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, gap: 12 },
  title: { fontSize: 26, fontWeight: "900" },
  coverImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
  },

  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },

  rowLabel: { fontSize: 12, fontWeight: "700" },
  rowValue: { fontSize: 18, fontWeight: "800" },

  navRow: { flexDirection: "row", gap: 12 },
  navBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  navBtnText: { fontWeight: "900" },

  subBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  subBtnText: { fontWeight: "900" },

  sectionTitle: { fontSize: 18, fontWeight: "900", marginTop: 10 },

  ratingBadge: { fontSize: 15, fontWeight: "800" },

  starsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  star: { fontSize: 28 },
  starOn: { color: "#fff" },
  starOff: { color: "#374151" },
  starValue: { marginLeft: 10, fontWeight: "800" },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
  },
  multiline: { textAlignVertical: "top" },

  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "white", fontWeight: "900" },

  reviewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  reviewMeta: { fontWeight: "900" },
  reviewDelete: { color: "#EF4444", fontWeight: "800" },

  btnDisabled: { opacity: 0.5 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  banner: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  bannerText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center",
  },
});