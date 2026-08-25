import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";
import { ANNOUNCEMENT_CATEGORY_LABELS, type Announcement } from "../types/announcement";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function NotificationRow({
  announcement,
  isRead,
  onRead,
}: {
  announcement: Announcement;
  isRead: boolean;
  onRead: () => void;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        setExpanded(true);
        onRead();
      }}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.metaRow}>
        <Text style={[styles.category, { color: "#ef4444" }]}>
          {ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}
        </Text>
        <Text style={[styles.date, { color: colors.muted }]}>
          {dateFormatter.format(new Date(announcement.publishedAt))}
        </Text>
        {!isRead ? <View accessibilityLabel="未読" style={styles.unreadDot} /> : null}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{announcement.title}</Text>
      <Text
        numberOfLines={expanded ? undefined : 3}
        style={[styles.description, { color: colors.muted }]}
      >
        {announcement.description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  category: { fontSize: 12, fontWeight: "900" },
  date: { flex: 1, fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  title: { fontSize: 17, fontWeight: "900", marginBottom: 7 },
  description: { fontSize: 14, lineHeight: 21 },
});
