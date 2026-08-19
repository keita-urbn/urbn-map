// components/InfoCategoryCard.tsx
// Visually identical to the List tab shop cards.
// Only difference: action area is a single "View" button (solid style).
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

interface InfoCategoryCardProps {
  title: string;
  subtitle?: string;
  onPressView: () => void;
}

export default function InfoCategoryCard({
  title,
  subtitle,
  onPressView,
}: InfoCategoryCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.card ?? colors.surface ?? colors.background,
        },
      ]}
    >
      {/* ── title row — identical to list.tsx `name` style ── */}
      <Text style={[styles.name, { color: colors.text }]}>{title}</Text>
      {!!subtitle && (
        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}

      {/* ── action row — one solid "View" button (same dimensions as list btnSolid) ── */}
      <View style={styles.btnRow}>
        <Pressable
          onPress={onPressView}
          style={({ pressed }) => [
            styles.btnSolid,
            { backgroundColor: colors.text },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.btnSolidText, { color: colors.background }]}>
            View
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── exactly matches list.tsx card / name / btnRow / btnSolid ──
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "900",
  },
  meta: {
    marginTop: 6,
    fontWeight: "700",
    fontSize: 14,
  },
  btnRow: {
    marginTop: 14,
    flexDirection: "row",
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
