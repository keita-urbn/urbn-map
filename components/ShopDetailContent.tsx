import { logReviewFailure, submissionError } from "../lib/reviewDiagnostics";
import ShopPhotoGallery from "./ShopPhotoGallery";
import type { DraftPhoto } from "../lib/photoGallery";
import { LinearGradient } from "expo-linear-gradient";
import ShopEditorial from "./ShopEditorial";
import ShopIcon from "./ShopIcon";
import ReviewMessage, { ReviewAvatar } from "./ReviewMessage";
import ReviewComposer from "./ReviewComposer";
import DisplayText from "./ui/DisplayText";
import BusinessHoursSection from "./BusinessHoursSection";
import RelatedShopsCarousel, { ConnectedRelatedShops } from "./RelatedShopsCarousel";
// app/shop/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import MetallicBackground from "./MetallicBackground";
import PremiumUpsellModal from "../components/PremiumUpsellModal";
import { FavoriteButton } from "../components/ui/FavoriteButton";
import { useAuth } from "../context/auth";
import { useReviews } from "../hooks/useReviews";
import { getMapsDestination } from "../lib/mapsDestination";
import { useRouteGuard } from "../hooks/useRouteGuard";
import { getShopById } from "../hooks/useShops";
import { useFavorites } from "../lib/favorites";
import { normalizeInstagramUrl, openInstagram } from "../lib/instagram";
import { addReview } from "../lib/reviews";
import { useTheme } from "../theme";
import type { ShopDoc } from "../types/shop";

type TravelMode = "walking" | "driving";

type Props = {
  shopId: string;
  relatedCandidates?: ShopDoc[];
  onSelectRelated?: (shop: ShopDoc) => void;
  header?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  scrollEnabled?: boolean;
  onScrollOffset?: (offset: number) => void;
};
export default function ShopDetailContent({ shopId, relatedCandidates, onSelectRelated, header, scrollRef, scrollEnabled = true, onScrollOffset }: Props) {
  const { colors } = useTheme();
  const { user, isPremium } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const {
    guardedDirections,
    guardedSearch,
    upsellVisible: routeUpsellVisible,
    upsellMessage: routeUpsellMessage,
    dismissUpsell: dismissRouteUpsell,
  } = useRouteGuard();

  const [shop, setShop] = useState<ShopDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const { reviews, loading: reviewsLoading, error: reviewsError, reload, deleteReview } = useReviews(shopId);

  const [reviewPhotos, setReviewPhotos] = useState<DraftPhoto[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const submissionBusy = useRef(false);
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
    let active = true;
    (async () => {
      try {
        const s = await getShopById(shopId);
        if (!s) {
          if (active) setLoadError("該当店舗がありません");

          return;
        }
        if (active) setShop(s);
      } catch {
        if (active) setLoadError("店舗情報を読み込めませんでした。もう一度開いてください。");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [shopId]);

  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  /** Refresh shop doc (to pick up updated ratingAverage/ratingCount) */
  const reloadShop = async () => {
    const s = await getShopById(shopId);
    if (s) setShop(s);
  };

  if (loading || !shop) {
    return (
      <View style={[styles.root, { backgroundColor: header ? "transparent" : colors.background }]}>
        {!header && <MetallicBackground subtle />}
        <ScrollView ref={scrollRef} scrollEnabled={scrollEnabled} contentContainerStyle={styles.content}>
          {header}
          <Text style={{ color: colors.text }}>{loadError || "Loading..."}</Text>
        </ScrollView>
      </View>
    );
  }

  const lat = Number(shop.lat);
  const lng = Number(shop.lng);
  const canNav = Boolean(getMapsDestination(shop));
  const instagramUrl = normalizeInstagramUrl(shop.instagram);

  // ── Guarded route actions (all share one usage bucket) ────────────────────────
  const handleRouteGuidance = async (mode: TravelMode) => {
    if (!canNav) return;
    await guardedDirections(lat, lng, mode, shop.name, shopId, shop.address, shop.googleMapsUrl);
  };

  const handleGoogleSearch = async () => {
    await guardedSearch(shop.name, shopId, shop.googleMapsUrl);
  };

  const handleInstagramPress = async () => {
    const ok = await openInstagram(shop.instagram);
    if (!ok) {
      console.warn("[instagram] open failed");
    }
  };

  // ── Gated favorite toggle ────────────────────────────────────────────────────
  const handleFavoriteToggle = async () => {
    return toggle(shopId, isPremium);
  };

  const requestReviewLogin = () => {
    if (Platform.OS === "web") {
      if (window.confirm("レビューを投稿するにはログインが必要です。ログインしますか？")) router.push("/login");
    } else {
      Alert.alert("", "レビューを投稿するにはログインが必要です", [
        { text: "キャンセル", style: "cancel" },
        { text: "ログイン", onPress: () => router.push("/login") },
      ]);
    }
  };
  const postReview = async () => {
    // ① Auth guard — same dialog as Favorites
    if (!user) { requestReviewLogin(); return; }

    if (posting || submissionBusy.current || !text.trim()) return;
    submissionBusy.current = true;
    setComposerError("");

    setPosting(true);
    try {
      // ② Transaction handles duplicate check + aggregation
      await addReview(shopId, { rating, text: text.trim(), images: reviewPhotos });
      setReviewPhotos([]);
      setText("");
      setRating(5);
      setComposerOpen(false);
      showBanner("レビューを投稿しました");
      await Promise.all([reload(), reloadShop()]);
    } catch (thrown: unknown) {
      logReviewFailure("composer-submit", thrown, { shopId, reviewId: user.uid, uid: user.uid });
      const e = submissionError(thrown);
      if (e.message === "ALREADY_REVIEWED") {
        setComposerError("1店舗につき1件のみ投稿可能です");
      } else {

        setComposerError(e?.message || "投稿に失敗しました。もう一度お試しください。");
      }
    } finally {
      submissionBusy.current = false;
      setPosting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: header ? "transparent" : colors.background }]}>
      {!header && <MetallicBackground subtle />}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        onScroll={event => onScrollOffset?.(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        nestedScrollEnabled
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >

      {header ?? <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <ShopIcon url={shop.mapIconUrl} path={shop.mapIconPath} size={68} />
        <DisplayText numberOfLines={2} style={[styles.title, { color: colors.text, flex: 1 }]}>{shop.name}</DisplayText>
        <FavoriteButton
          saved={isFavorite(shopId)}
          onToggle={handleFavoriteToggle}
          onLimitReached={() => setFavUpsellVisible(true)}
        />
      </View>}

      <BusinessHoursSection hours={shop.businessHours} />

      <ShopPhotoGallery images={shop.galleryImages ?? []} />

      {!header && <Text style={{ color: colors.muted }}>{[shop.area, shop.genre].filter(Boolean).join(" · ")}</Text>}
      <ShopEditorial shop={shop} />
      {(shop.address?.trim() || shop.brands?.trim() || instagramUrl) && <View style={[styles.card, { backgroundColor: colors.card ?? colors.surface }]}>
        <DisplayText style={{ color: colors.text, fontSize: 20 }}>SHOP INFORMATION</DisplayText>
        {!header && <Text style={{ color: colors.muted }}>★ {(shop.ratingAverage ?? 0).toFixed(1)} ({shop.ratingCount ?? 0})</Text>}
        {!!shop.address?.trim() && <Row label="住所" value={shop.address} />}
        {!!shop.brands?.trim() && <Row label="ブランド" value={shop.brands} />}
        {instagramUrl ? <InstagramActionRow onPress={handleInstagramPress} /> : null}
      </View>}

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

      <Pressable accessibilityRole="button" accessibilityLabel="レビューを書く" onPress={() => {
        if (!user) {
          requestReviewLogin();
          return;
        }
        setComposerError(""); setComposerOpen(true);
      }} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
        <ReviewAvatar uri={user?.photoURL} />
        <View style={{ flex: 1, minWidth: 0, borderRadius: 18, padding: 16, backgroundColor: colors.surface }}><Text style={{ color: colors.muted, fontSize: 15 }}>このショップについてどう思う？</Text></View>
      </Pressable>
      {!!reviewsError && <Text accessibilityRole="alert" style={{ color: "#ef4444" }}>レビューを読み込めませんでした</Text>}
      {reviewsLoading && <Text style={{ color: colors.muted }}>レビューを読み込み中…</Text>}
      {!reviewsLoading && !reviewsError && !reviews.length && <Text style={{ color: colors.muted, paddingVertical: 12 }}>まだレビューはありません。最初の体験を聞かせてください。</Text>}
      {reviews.map(review => <ReviewMessage key={review.id} review={review}
        name={review.userId === user?.uid ? user?.displayName : undefined}
        photoUrl={review.userId === user?.uid ? user?.photoURL : undefined}
        onDelete={user && review.userId === user.uid ? () => Alert.alert("削除しますか？", "", [
          { text: "キャンセル", style: "cancel" },
          { text: "削除", style: "destructive", onPress: async () => {
            try { const result = await deleteReview(review.id); await reloadShop(); showBanner(result?.cleanupFailed ? "レビューは削除済みです。写真のStorage削除に再試行が必要です" : "レビューを削除しました"); }
            catch { showBanner("削除に失敗しました"); }
          } },
        ]) : undefined} />)}
      {relatedCandidates ? <RelatedShopsCarousel current={shop} shops={relatedCandidates} onSelect={onSelectRelated} /> : <ConnectedRelatedShops current={shop} />}
      </ScrollView>

      <ReviewComposer images={reviewPhotos} onImages={setReviewPhotos} visible={composerOpen} rating={rating} text={text} posting={posting} error={composerError} onRating={setRating} onText={setText} onClose={() => setComposerOpen(false)} onSubmit={() => void postReview()} />

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

function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const content = (
    <>
      <Text style={[styles.rowLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: onPress ? "#3b82f6" : colors.text }]}>{value}</Text>
    </>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : <View>{content}</View>;
}

function InstagramActionRow({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.instagramRow}>
      <Text style={[styles.rowLabel, { color: colors.muted }]}>Instagram</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.instagramButton,
          {
            borderColor: colors.border,
            backgroundColor: colors.card ?? colors.surface,
          },
          pressed && { opacity: 0.75 },
        ]}
        accessibilityRole="link"
        accessibilityLabel="Instagramプロフィールを開く"
        hitSlop={8}
      >
        <LinearGradient colors={["#833AB4", "#E1306C", "#FCAF45"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" }}><Ionicons name="logo-instagram" size={24} color="#fff" /></LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 40, gap: 18 },
  title: { fontSize: 26, fontWeight: "900" },
  coverImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
  },

  card: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },

  rowLabel: { fontSize: 12, fontWeight: "700" },
  rowValue: { fontSize: 14, lineHeight: 22, fontWeight: "400" },
  instagramRow: {
    alignItems: "flex-start",
    gap: 8,
  },
  instagramButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

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
