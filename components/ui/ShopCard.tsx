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
  isFavorite: (id: string) => boolean;
  toggle: (id: string, isPremium?: boolean) => any;
  /** Called when a free user hits the favorites limit */
  onFavoriteLimit?: () => void;
  isPremium?: boolean;
  /** Override / extend card container style (e.g. fixed width for carousel) */
  style?: ViewStyle;
};

export function ShopCard({ item, isFavorite, toggle, onFavoriteLimit, isPremium = false, style }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isAdmin } = useAuth();

  const id = String((item as any).id ?? item.id);
  const meta = shopMeta(item);
  const cardBg = (colors as any).card ?? (colors as any).surface ?? colors.background;

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
      {/* Heart toggle */}
      <View style={styles.heartBtn}>
        <FavoriteButton
          saved={isFavorite(id)}
          onToggle={() => toggle(id, isPremium)}
          onLimitReached={onFavoriteLimit}
        />
      </View>

      {item.imageUrl?.trim() ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
      ) : null}

      <Text style={[styles.name, { color: colors.text }]}>
        {(item as any).name ?? "Shop"}
      </Text>

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
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    marginBottom: 12,
  },
  name: {
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
