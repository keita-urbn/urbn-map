// components/ui/PostCard.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useTheme } from "../../theme";
import type { PostDoc } from "../../types/post";

interface PostCardProps {
  post: PostDoc;
  /** Whether the current user has premium access */
  isPremium?: boolean;
  /** Admin can see everything + delete */
  isAdmin?: boolean;
  /** Called when admin taps delete */
  onDelete?: (id: string) => void;
  /** Called when free user taps the premium CTA */
  onPremiumCTA?: () => void;
  /** External style override (width, margin etc.) */
  style?: ViewStyle;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function PostCard({
  post,
  isPremium = false,
  isAdmin = false,
  onDelete,
  onPremiumCTA,
  style,
}: PostCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const canReadBody = isPremium || isAdmin;

  return (
    <View style={[styles.card, style]}>
      {/* Date */}
      <Text style={styles.date}>{formatDate(post.createdAt)}</Text>

      {/* Title */}
      <Text style={styles.title}>{post.title}</Text>

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <View style={styles.tagRow}>
          {post.hashtags.map((tag, i) => (
            <View key={`${tag}-${i}`} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Abstract */}
      {!!post.abstract && (
        <Text style={styles.abstract}>{post.abstract}</Text>
      )}

      {/* Body — premium or admin only */}
      {canReadBody ? (
        !!post.body && <Text style={styles.body}>{post.body}</Text>
      ) : (
        <View style={styles.lockedWrap}>
          {/* Blurred preview (first ~80 chars) */}
          <View style={styles.blurredPreview}>
            <Text style={styles.blurredText} numberOfLines={4}>
              {post.body || "プレミアム限定コンテンツ"}
            </Text>
            {/* Gradient overlay */}
            <LinearGradient
              colors={[
                "transparent",
                isDark ? "rgba(15,15,16,0.85)" : "rgba(255,255,255,0.85)",
                isDark ? "#0f0f10" : "#ffffff",
              ]}
              style={styles.gradient}
            />
          </View>

          {/* Premium CTA */}
          <Pressable
            onPress={onPremiumCTA}
            style={({ pressed }) => [
              styles.ctaBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.ctaIcon}>🔒</Text>
            <Text style={styles.ctaText}>
              Unlock full content with Premium
            </Text>
          </Pressable>
        </View>
      )}

      {/* Admin delete */}
      {isAdmin && onDelete && (
        <Pressable
          onPress={() => onDelete(post.id)}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
        >
          <Text style={styles.deleteText}>削除</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card ?? colors.surface,
      padding: 16,
      overflow: "hidden",
    },

    date: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.muted,
      marginBottom: 4,
    },

    title: {
      fontSize: 20,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 8,
    },

    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 10,
    },
    tag: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    tagText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.muted,
    },

    abstract: {
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
      color: colors.text,
      marginBottom: 10,
    },

    body: {
      fontSize: 14,
      fontWeight: "500",
      lineHeight: 22,
      color: colors.text,
      marginTop: 4,
    },

    /* ── Locked body area ── */
    lockedWrap: {
      marginTop: 4,
    },
    blurredPreview: {
      position: "relative",
      overflow: "hidden",
      minHeight: 70,
    },
    blurredText: {
      fontSize: 14,
      fontWeight: "500",
      lineHeight: 22,
      color: colors.muted,
      opacity: 0.4,
    },
    gradient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 60,
    },
    ctaBtn: {
      marginTop: 8,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      backgroundColor: isDark ? "#1e1e22" : "#f3f4f6",
      borderWidth: 1,
      borderColor: colors.border,
    },
    ctaIcon: {
      fontSize: 16,
    },
    ctaText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
    },

    /* ── Admin delete ── */
    deleteBtn: {
      marginTop: 12,
      alignSelf: "flex-end",
    },
    deleteText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#ef4444",
    },
  });
}
