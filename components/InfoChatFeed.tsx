// components/InfoChatFeed.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  type AnnouncementMessage,
  parseHashtags,
  useAnnouncements,
} from "../hooks/useAnnouncements";
import { useTheme } from "../theme";

const ABSTRACT_MAX = 200;

function formatDateLabel(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function isSameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

interface InfoChatFeedProps {
  collectionName: string;
  isAdmin?: boolean;
  isPremium?: boolean;
  onPremiumCTA?: () => void;
  premiumCtaLabel?: string;
}

export default function InfoChatFeed({
  collectionName,
  isAdmin = false,
  isPremium = false,
  onPremiumCTA,
  premiumCtaLabel = "Premiumでアンロック",
}: InfoChatFeedProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    announcements,
    loading,
    demoMode,
    addAnnouncement,
    deleteAnnouncement,
    sendError,
    clearSendError,
  } = useAnnouncements(collectionName);

  // ── composer state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [abstract, setAbstract] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── derived / computed ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  const orderedMessages = useMemo(
    () => [...announcements].sort((a, b) => a.createdAt - b.createdAt),
    [announcements]
  );

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orderedMessages;
    return orderedMessages.filter((m) =>
      m.title.toLowerCase().includes(q) ||
      m.abstract.toLowerCase().includes(q) ||
      m.hashtags.some((h) => h.toLowerCase().includes(q))
    );
  }, [orderedMessages, searchQuery]);

  const canSend = title.trim().length > 0 && !sending;
  const errorMessage = localError || sendError;

  // ── handlers ────────────────────────────────────────────────────────────────
  const resetComposer = useCallback(() => {
    setTitle("");
    setHashtags("");
    setAbstract("");
    setBody("");
    setLocalError("");
    clearSendError();
  }, [clearSendError]);

  const onSend = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setLocalError("タイトルを入力してください");
      return;
    }
    setSending(true);
    clearSendError();
    const result = await addAnnouncement({
      kind: collectionName as AnnouncementMessage["kind"],
      title: trimmedTitle,
      hashtags: parseHashtags(hashtags),
      abstract: abstract.trim(),
      body: body.trim(),
    });
    setSending(false);
    if (!result.ok) {
      setLocalError("送信に失敗しました");
      return;
    }
    resetComposer();
  }, [title, hashtags, abstract, body, collectionName, addAnnouncement, clearSendError, resetComposer]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteTargetId);
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, deleteAnnouncement]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalVisible(false);
    setDeleteTargetId(null);
  }, []);

  const openDeleteModal = useCallback((id: string) => {
    setDeleteTargetId(id);
    setDeleteModalVisible(true);
  }, []);

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>読み込み中...</Text>
      </View>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Banners */}
      {demoMode && (
        <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bannerText, { color: colors.muted }]}>Demo mode</Text>
        </View>
      )}
      {!!errorMessage && (
        <View style={[styles.errorBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.errorText, { color: colors.text }]}>{errorMessage}</Text>
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchWrap, { paddingHorizontal: 12, paddingTop: 8, backgroundColor: colors.background }]}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="タイトル・タグで検索…"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.card ?? colors.surface, color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery("")}
            style={[styles.clearBtn, { backgroundColor: isDark ? "#2a2a2a" : "#e5e7eb" }]}
            hitSlop={8}
          >
            <Text style={[styles.clearText, { color: colors.muted }]}>×</Text>
          </Pressable>
        )}
      </View>

      {/* Post list */}
      {filteredMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {searchQuery.trim() ? "検索結果なし" : "まだ投稿がありません"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          renderItem={({ item, index }) => {
            const prev = filteredMessages[index - 1];
            const showDate =
              index === 0 ||
              !isSameDay(item.createdAt, prev?.createdAt ?? item.createdAt);

            return (
              <View>
                {showDate && (
                  <View style={styles.dateSeparator}>
                    <Text style={[styles.dateText, { color: colors.muted }]}>
                      {formatDateLabel(item.createdAt)}
                    </Text>
                  </View>
                )}
                <StructuredPostCard
                  post={item}
                  canReadBody={isPremium || isAdmin}
                  isAdmin={isAdmin}
                  isDark={isDark}
                  colors={colors}
                  onDelete={openDeleteModal}
                  onPremiumCTA={onPremiumCTA}
                  premiumCtaLabel={premiumCtaLabel}
                />
              </View>
            );
          }}
        />
      )}

      {/* Admin structured composer */}
      {isAdmin && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
        >
          <View
            style={[
              styles.composerWrap,
              { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + 6 },
            ]}
          >
            <ScrollView
              style={styles.composerScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <TextInput
                style={[styles.composerInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                placeholder="Title *"
                placeholderTextColor={colors.muted}
                value={title}
                onChangeText={(t) => { setTitle(t); setLocalError(""); clearSendError(); }}
              />

              {/* Hashtags */}
              <TextInput
                style={[styles.composerInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, marginTop: 8 }]}
                placeholder="#tokyo, #selectshop"
                placeholderTextColor={colors.muted}
                value={hashtags}
                onChangeText={setHashtags}
                autoCapitalize="none"
              />
              {hashtags.trim().length > 0 && (
                <View style={styles.tagPreview}>
                  {parseHashtags(hashtags).map((tag, i) => (
                    <View key={`${tag}-${i}`} style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.tagText, { color: colors.text }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Abstract */}
              <View style={styles.labelRow}>
                <Text style={[styles.composerLabel, { color: colors.muted }]}>Abstract</Text>
                <Text style={[styles.charCounter, abstract.length >= ABSTRACT_MAX && styles.charCounterOver]}>
                  {abstract.length}/{ABSTRACT_MAX}
                </Text>
              </View>
              <TextInput
                style={[styles.composerInput, styles.composerMultiline, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                placeholder="概要（任意）"
                placeholderTextColor={colors.muted}
                value={abstract}
                onChangeText={(t) => setAbstract(t.slice(0, ABSTRACT_MAX))}
                multiline
                maxLength={ABSTRACT_MAX}
              />

              {/* Body */}
              <Text style={[styles.composerLabel, { color: colors.muted, marginTop: 8 }]}>Body</Text>
              <TextInput
                style={[styles.composerInput, styles.composerBody, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                placeholder="本文（プレミアム限定）"
                placeholderTextColor={colors.muted}
                value={body}
                onChangeText={setBody}
                multiline
              />

              {/* Submit row */}
              <View style={styles.composerBtnRow}>
                <Pressable
                  onPress={resetComposer}
                  style={({ pressed }) => [
                    styles.resetBtn,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.resetBtnText, { color: colors.muted }]}>リセット</Text>
                </Pressable>
                <Pressable
                  onPress={onSend}
                  disabled={!canSend}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    { backgroundColor: canSend ? colors.text : colors.border },
                    pressed && canSend && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.sendBtnText, { color: canSend ? colors.background : colors.muted }]}>
                    {sending ? "送信中..." : "投稿"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Delete confirmation modal */}
      <Modal
        transparent
        animationType="fade"
        visible={deleteModalVisible}
        onRequestClose={handleDeleteCancel}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleDeleteCancel}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>削除</Text>
            <Text style={[styles.modalMessage, { color: colors.muted }]}>この投稿を削除しますか？</Text>
            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: colors.border }]}
                disabled={deleting}
                onPress={handleDeleteCancel}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalDeleteButton, { opacity: deleting ? 0.6 : 1 }]}
                disabled={deleting}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.modalDeleteText}>{deleting ? "削除中..." : "削除"}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StructuredPostCard({
  post,
  canReadBody,
  isAdmin,
  isDark,
  colors,
  onDelete,
  onPremiumCTA,
  premiumCtaLabel,
}: {
  post: AnnouncementMessage;
  canReadBody: boolean;
  isAdmin: boolean;
  isDark: boolean;
  colors: any;
  onDelete: (id: string) => void;
  onPremiumCTA?: () => void;
  premiumCtaLabel: string;
}) {
  return (
    <View style={[cardStyles.card, { borderColor: colors.border, backgroundColor: colors.card ?? colors.surface }]}>
      {/* Title */}
      <Text style={[cardStyles.title, { color: colors.text }]}>{post.title}</Text>

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <View style={cardStyles.tagRow}>
          {post.hashtags.map((tag, i) => (
            <View key={`${tag}-${i}`} style={[cardStyles.tag, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[cardStyles.tagText, { color: colors.muted }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Abstract */}
      {!!post.abstract && (
        <Text style={[cardStyles.abstract, { color: colors.text }]}>{post.abstract}</Text>
      )}

      {/* Body — premium gated */}
      {canReadBody ? (
        !!post.body && (
          <Text style={[cardStyles.body, { color: colors.text }]}>{post.body}</Text>
        )
      ) : (
        !!post.body && (
          <View style={cardStyles.lockedWrap}>
            {/* Blurred preview */}
            <View style={cardStyles.blurredPreview}>
              <Text style={[cardStyles.blurredText, { color: colors.muted }]} numberOfLines={4}>
                {post.body}
              </Text>
              <LinearGradient
                colors={[
                  "transparent",
                  isDark ? "rgba(22,22,24,0.88)" : "rgba(255,255,255,0.88)",
                  isDark ? "#161618" : "#ffffff",
                ]}
                style={cardStyles.gradient}
              />
            </View>
            {/* CTA */}
            <Pressable
              onPress={onPremiumCTA}
              disabled={!onPremiumCTA}
              style={({ pressed }) => [
                cardStyles.ctaBtn,
                { backgroundColor: isDark ? "#1e1e22" : "#f3f4f6", borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={cardStyles.ctaIcon}>🔒</Text>
              <Text style={[cardStyles.ctaText, { color: colors.text }]}>
                {premiumCtaLabel}
              </Text>
            </Pressable>
          </View>
        )
      )}

      {/* Admin delete */}
      {isAdmin && (
        <Pressable
          onPress={() => onDelete(post.id)}
          hitSlop={8}
          style={({ pressed }) => [cardStyles.deleteBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={cardStyles.deleteText}>削除</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  banner: { paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, alignItems: "center" },
  bannerText: { fontSize: 12, fontWeight: "600" },
  errorBanner: { paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, alignItems: "center" },
  errorText: { fontSize: 12, fontWeight: "700" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, fontWeight: "600" },
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  searchWrap: { position: "relative", justifyContent: "center" },
  searchInput: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingRight: 40, fontSize: 14 },
  clearBtn: { position: "absolute", right: 20, height: 28, width: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  clearText: { fontSize: 18, fontWeight: "800", lineHeight: 20 },
  dateSeparator: { alignItems: "center", marginTop: 4, marginBottom: 10 },
  dateText: { fontSize: 12, fontWeight: "700" },

  // Composer
  composerWrap: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10 },
  composerScroll: { maxHeight: 360 },
  composerInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  composerMultiline: { minHeight: 72, textAlignVertical: "top" },
  composerBody: { minHeight: 100, textAlignVertical: "top" },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 },
  composerLabel: { fontSize: 12, fontWeight: "700" },
  charCounter: { fontSize: 11, fontWeight: "700", color: "#6b7280" },
  charCounterOver: { color: "#ef4444" },
  tagPreview: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: "700" },
  composerBtnRow: { flexDirection: "row", gap: 10, marginTop: 10, marginBottom: 4 },
  resetBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  resetBtnText: { fontSize: 14, fontWeight: "700" },
  sendBtn: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  sendBtnText: { fontSize: 14, fontWeight: "900" },

  // Delete modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingVertical: 20, borderTopWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  modalMessage: { fontSize: 14, fontWeight: "500", marginBottom: 16 },
  modalButtonRow: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  modalCancelButton: { borderWidth: 1 },
  modalDeleteButton: { backgroundColor: "#ef4444" },
  modalCancelText: { fontSize: 14, fontWeight: "600" },
  modalDeleteText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
});

const cardStyles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, overflow: "hidden" },
  title: { fontSize: 18, fontWeight: "900", marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tag: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: "700" },
  abstract: { fontSize: 14, fontWeight: "600", lineHeight: 20, marginBottom: 10 },
  body: { fontSize: 14, fontWeight: "500", lineHeight: 22, marginTop: 4 },
  lockedWrap: { marginTop: 4 },
  blurredPreview: { position: "relative", overflow: "hidden", minHeight: 64 },
  blurredText: { fontSize: 14, fontWeight: "500", lineHeight: 22, opacity: 0.35 },
  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 56 },
  ctaBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  ctaIcon: { fontSize: 15 },
  ctaText: { fontSize: 13, fontWeight: "800" },
  pending: { marginTop: 6, fontSize: 12, fontWeight: "600" },
  deleteBtn: { marginTop: 10, alignSelf: "flex-end" },
  deleteText: { fontSize: 13, fontWeight: "800", color: "#ef4444" },
});
