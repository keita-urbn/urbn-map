import ShopIcon from "../ShopIcon";
import DisplayText from "./DisplayText";
// components/ui/ShopCard.tsx
// Shared shop card used by Shop List, Favorites tab, and Favorites list.
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useAuth } from "../../context/auth";
import { useTheme } from "../../theme";
import type { ShopDoc } from "../../types/shop";
import { FavoriteButton } from "./FavoriteButton";

export function shopMeta(item: ShopDoc) {
  const area = ((item as any).area ?? "").toString().trim();
  const genre = ((item as any).genre ?? "").toString().trim();
  return [area, genre].filter(Boolean).join(" ・ ");
}

type Props = {
  item: ShopDoc;
  /** Compact, cover-free presentation for Search; other consumers retain their layout. */
  compact?: boolean;
  isFavorite: (id: string) => boolean;
  toggle: (id: string, isPremium?: boolean) => any;
  /** Called when a free user hits the favorites limit */
  onFavoriteLimit?: () => void;
  isPremium?: boolean;
  /** Override / extend card container style (e.g. fixed width for carousel) */
  style?: ViewStyle;
};

export function ShopCard({ item, isFavorite, toggle, onFavoriteLimit, isPremium = false, style, compact = false }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAdmin } = useAuth();

  const id = String((item as any).id ?? item.id);
  const meta = shopMeta(item);
  const cardBg = (colors as any).card ?? (colors as any).surface ?? colors.background;

  if (compact) {
    const rating = `★ ${(item.ratingAverage ?? 0).toFixed(1)} (${item.ratingCount ?? 0})`;
    return (
      <View style={[styles.card, styles.compactCard, { borderColor: colors.border, backgroundColor: cardBg }, style]}>
        {/* Sibling targets: favorites/Edit never bubble through a detail Pressable. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.name || "Shop"}、${meta}、${rating}、店舗詳細を開く`}
          onPress={() => router.push(`/shop/${id}`)}
          style={({ pressed }) => [StyleSheet.absoluteFill, styles.cardTarget, pressed && { backgroundColor: "rgba(127,127,127,0.12)" }]}
        />
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.compactInfo}>
          <View style={styles.titleRow}>
            <ShopIcon url={item.mapIconUrl} path={item.mapIconPath} size={60} />
            <DisplayText numberOfLines={3} ellipsizeMode="tail" style={[styles.name, { color: colors.text }]}>{item.name || "Shop"}</DisplayText>
          </View>
          {!!meta && <Text style={[styles.meta, { color: colors.muted }]}>{meta}</Text>}
          <Text style={[styles.ratingText, { color: colors.text }]}>{rating}</Text>
        </View>
        <View pointerEvents="box-none" style={styles.compactActions}>
          <View pointerEvents="box-none" style={styles.compactHeart}><FavoriteButton saved={isFavorite(id)} onToggle={() => toggle(id, isPremium)} onLimitReached={onFavoriteLimit} /></View>
          {isAdmin && <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name || "Shop"}を編集`}
            onPress={() => router.push(`/admin/edit-shop/${id}`)}
            style={({ pressed }) => [styles.compactEdit, { backgroundColor: colors.text }, pressed && { opacity: .8 }]}
          ><Text style={[styles.btnSolidText, { color: colors.background }]}>編集</Text></Pressable>}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: cardBg,
        },
        style,
      ]}
    >
      {item.imageUrl?.trim() ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
      ) : null}

      <View style={styles.titleRow}>
        <ShopIcon url={item.mapIconUrl} path={item.mapIconPath} size={60} />
        <DisplayText numberOfLines={2} ellipsizeMode="tail" style={[styles.name, { color: colors.text }]}>
          {item.name || "Shop"}
        </DisplayText>
        <View style={styles.heartBtn}>
          <FavoriteButton saved={isFavorite(id)} onToggle={() => toggle(id, isPremium)} onLimitReached={onFavoriteLimit} />
        </View>
      </View>

      {!!meta && (
        <Text style={[styles.meta, { color: (colors as any).muted }]}>
          {meta}
        </Text>
      )}

      <Text style={[styles.ratingText, { color: colors.text }]}>
        ★ {((item as any).ratingAverage ?? 0).toFixed(1)} ({(item as any).ratingCount ?? 0})
      </Text>

      <View style={styles.btnRow}>
        <Pressable
          onPress={() => router.push(`/shop/${id}`)}
          style={({ pressed }) => [
            styles.btnOutline,
            { borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.btnOutlineText, { color: colors.text }]}>詳細</Text>
        </Pressable>

        {isAdmin && (
          <Pressable
            onPress={() => router.push(`/admin/edit-shop/${id}`)}
            style={({ pressed }) => [
              styles.btnSolid,
              { backgroundColor: colors.text },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.btnSolidText, { color: colors.background }]}>編集</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    position: "relative",
  },
  compactCard: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, gap: 10 },
  cardTarget: { borderRadius: 18 },
  compactInfo: { flex: 1, minWidth: 0 },
  compactActions: { alignItems: "center", gap: 6, flexShrink: 0 },
  compactHeart: { width: 48, height: 44, alignItems: "center", justifyContent: "center" },
  compactEdit: { minHeight: 44, minWidth: 48, paddingHorizontal: 10, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heartBtn: { flexShrink: 0 },
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    marginBottom: 12,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: "900",
  },
  meta: {
    marginTop: 6,
    fontWeight: "700",
  },
  ratingText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
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
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    fontWeight: "800",
  },
  btnSolid: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSolidText: {
    fontWeight: "900",
  },
});
