// app/shop/[id].tsx
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useReviews } from "../../hooks/useReviews";
import { getShopById } from "../../hooks/useShops";
import { addReview } from "../../lib/reviews";
import type { ShopDoc } from "../../types/shop";

const PH = "#9CA3AF";

type TravelMode = "walking" | "driving";

async function openGoogleDirections(lat: number, lng: number, mode: TravelMode) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${mode}`;
  await Linking.openURL(url);
}

async function openGoogleSearch(query: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
  await Linking.openURL(url);
}

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[styles.star, value >= n ? styles.starOn : styles.starOff]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.starValue}>{value}/5</Text>
    </View>
  );
}

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopId = String(id ?? "");

  const [shop, setShop] = useState<ShopDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const { reviews, reload, deleteReview } = useReviews(shopId);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

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

  if (loading || !shop) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const lat = Number(shop.lat);
  const lng = Number(shop.lng);
  const canNav = Number.isFinite(lat) && Number.isFinite(lng);

  const postReview = async () => {
    if (!text.trim()) return;
    setPosting(true);
    await addReview(shopId, { rating, text: text.trim() });
    setText("");
    setRating(5);
    await reload();
    setPosting(false);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{shop.name}</Text>

      <View style={styles.card}>
        <Row label="エリア" value={shop.area ?? "未設定"} />
        <Row label="ジャンル" value={shop.genre ?? "未設定"} />
        <Row label="住所" value={shop.address ?? "未設定"} />
        <Row label="ブランド" value={shop.brands ?? "未設定"} />
        <Row label="Instagram" value={shop.instagram ?? "未設定"} />
        <Row label="コメント" value={shop.comment ?? "未設定"} />
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, !canNav && styles.btnDisabled]}
          disabled={!canNav}
          onPress={() => openGoogleDirections(lat, lng, "walking")}
        >
          <Text style={styles.navBtnText}>徒歩で行く</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, !canNav && styles.btnDisabled]}
          disabled={!canNav}
          onPress={() => openGoogleDirections(lat, lng, "driving")}
        >
          <Text style={styles.navBtnText}>車で行く</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.subBtn}
        onPress={() => openGoogleSearch(shop.name)}
      >
        <Text style={styles.subBtnText}>Google Mapsで検索</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>レビュー</Text>

      {(reviews ?? []).map((r: any) => (
        <View key={r.id} style={styles.reviewCard}>
          <Text style={styles.reviewMeta}>{r.rating} / 5</Text>
          <Text>{r.text}</Text>
          <TouchableOpacity onPress={() => deleteReview(r.id)}>
            <Text style={styles.reviewDelete}>削除</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.sectionTitle}>レビュー投稿</Text>

      <Stars value={rating} onChange={setRating} />

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="レビューを書く"
        placeholderTextColor={PH}
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
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 14, gap: 12 },
  title: { fontSize: 26, fontWeight: "900" },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },

  rowLabel: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  rowValue: { fontSize: 18, fontWeight: "800" },

  navRow: { flexDirection: "row", gap: 12 },
  navBtn: {
    flex: 1,
    backgroundColor: "black",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  navBtnText: { color: "white", fontWeight: "900" },

  subBtn: {
    borderWidth: 2,
    borderColor: "#111827",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  subBtnText: { fontWeight: "900" },

  sectionTitle: { fontSize: 18, fontWeight: "900", marginTop: 10 },

  starsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  star: { fontSize: 28 },
  starOn: { color: "#111827" },
  starOff: { color: "#E5E7EB" },
  starValue: { marginLeft: 10, fontWeight: "800" },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
  },
  multiline: { minHeight: 90 },

  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "white", fontWeight: "900" },

  reviewCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  reviewMeta: { fontWeight: "900" },
  reviewDelete: { color: "#EF4444", fontWeight: "800" },

  btnDisabled: { opacity: 0.6 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
