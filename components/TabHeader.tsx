import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { canUseDisplayFont, DISPLAY_FONT } from "../lib/displayFont";
import { useTheme } from "../theme";
import { useTypography } from "../theme/typography";
import NotificationBell from "./NotificationBell";

// Render inside the scroll content padded by useTabContentInsets.
export default function TabHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  const { colors } = useTheme();
  const { loaded } = useTypography();
  const typography = loaded && canUseDisplayFont(title) ? styles.displayTitle : styles.systemTitle;

  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={[styles.title, typography, { color: colors.text }]}>{title}</Text>
      <View style={styles.actions}>
        {actions}
        <NotificationBell />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 54, paddingBottom: 14, flexDirection: "row", alignItems: "center" },
  title: { flex: 1, includeFontPadding: false },
  systemTitle: { fontSize: 22, fontWeight: "900", lineHeight: 28, letterSpacing: 0 },
  // Anton's condensed capitals need a larger size to match the Japanese titles.
  displayTitle: { fontFamily: DISPLAY_FONT, fontSize: 26, fontWeight: "400", lineHeight: 36, letterSpacing: 0 },
  actions: { flexDirection: "row", alignItems: "center" },
});
