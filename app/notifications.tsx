import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import NotificationRow from "../components/NotificationRow";
import { useGlobalAnnouncements } from "../context/announcements";
import { useAuth } from "../context/auth";
import { createAnnouncement } from "../lib/announcements";
import { useTheme } from "../theme";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  type AnnouncementCategory,
} from "../types/announcement";

function getBackTitle(from: string | string[] | undefined): string {
  switch (from) {
    case "map":
      return "MAP";
    case "shop":
      return "SHOP";
    case "favorites":
      return "お気に入り";
    case "trending":
      return "Trending";
    default:
      return "戻る";
  }
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user, isAdmin } = useAuth();
  const { announcements, readIds, loading, error, retry, markRead } = useGlobalAnnouncements();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const [tab, setTab] = useState<"feed" | "post">("feed");
  const [category, setCategory] = useState<AnnouncementCategory>("NEW_SHOP");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  const backTitle = getBackTitle(params.from);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: backTitle,
      headerBackTitleVisible: true,
    });
  }, [backTitle, navigation]);

  useEffect(() => {
    if (!isAdmin) setTab("feed");
  }, [isAdmin]);

  const inputStyle = useMemo(
    () => [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }],
    [colors],
  );

  const submit = async () => {
    if (!isAdmin || !user?.uid || submitting) return;
    if (!title.trim() || !description.trim()) {
      setFormMessage("タイトルと本文を入力してください");
      return;
    }
    setSubmitting(true);
    setFormMessage("");
    try {
      await createAnnouncement({ category, title, description, publishedAt: new Date(), createdBy: user.uid });
      setTitle("");
      setDescription("");
      setCategory("NEW_SHOP");
      setFormMessage("お知らせを公開しました");
      setTab("feed");
    } catch (submitError) {
      console.error("[announcements] create error:", submitError);
      setFormMessage("公開できませんでした。もう一度お試しください");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = isAdmin ? (
    <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
      {(["feed", "post"] as const).map((value) => (
        <Pressable key={value} onPress={() => setTab(value)} style={styles.tab}>
          <Text style={[styles.tabText, { color: tab === value ? colors.text : colors.muted }]}>
            {value === "feed" ? "お知らせ" : "投稿"}
          </Text>
          {tab === value ? <View style={styles.tabIndicator} /> : null}
        </Pressable>
      ))}
    </View>
  ) : null;

  if (tab === "post" && isAdmin) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.screen, { backgroundColor: colors.background }]}
      >
        {tabs}
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.text }]}>カテゴリー</Text>
          <View style={styles.chips}>
            {ANNOUNCEMENT_CATEGORIES.map((value) => (
              <Pressable
                key={value}
                onPress={() => setCategory(value)}
                style={[
                  styles.chip,
                  { borderColor: category === value ? "#ef4444" : colors.border },
                  category === value && styles.chipSelected,
                ]}
              >
                <Text style={{ color: category === value ? "#fff" : colors.text, fontWeight: "800" }}>
                  {ANNOUNCEMENT_CATEGORY_LABELS[value]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.text }]}>タイトル</Text>
          <TextInput
            maxLength={120}
            onChangeText={setTitle}
            placeholder="お知らせのタイトル"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            value={title}
          />
          <Text style={[styles.label, { color: colors.text }]}>本文</Text>
          <TextInput
            maxLength={4000}
            multiline
            onChangeText={setDescription}
            placeholder="内容を入力してください"
            placeholderTextColor={colors.muted}
            style={[inputStyle, styles.textarea]}
            textAlignVertical="top"
            value={description}
          />
          <Text style={[styles.publishTiming, { color: colors.muted }]}>公開日時：今すぐ</Text>
          {formMessage ? <Text style={[styles.message, { color: colors.text }]}>{formMessage}</Text> : null}
          <Pressable
            disabled={submitting}
            onPress={submit}
            style={({ pressed }) => [styles.submit, (pressed || submitting) && { opacity: 0.6 }]}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>投稿する</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {tabs}
      {formMessage ? (
        <Text style={[styles.feedMessage, { color: colors.text, borderBottomColor: colors.border }]}>
          {formMessage}
        </Text>
      ) : null}
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.stateText, { color: colors.muted }]}>{error}</Text>
          <Pressable onPress={retry} style={[styles.retry, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>再読み込み</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={announcements.length ? undefined : styles.emptyList}
          data={announcements}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={[styles.stateText, { color: colors.muted }]}>現在、お知らせはありません</Text>}
          renderItem={({ item }) => (
            <NotificationRow
              announcement={item}
              isRead={readIds.has(item.id)}
              onRead={() => void markRead(item.id).catch(() => {})}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, height: 48, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 14, fontWeight: "900" },
  tabIndicator: { position: "absolute", bottom: 0, width: 52, height: 3, backgroundColor: "#ef4444" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  stateText: { fontSize: 14, textAlign: "center" },
  retry: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  form: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: "900", marginBottom: 9, marginTop: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipSelected: { backgroundColor: "#ef4444" },
  input: { width: "100%", borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textarea: { minHeight: 180 },
  publishTiming: { marginTop: 14, fontSize: 13 },
  message: { marginTop: 16, textAlign: "center", fontWeight: "700" },
  feedMessage: { padding: 12, textAlign: "center", fontWeight: "800", borderBottomWidth: StyleSheet.hairlineWidth },
  submit: { height: 48, marginTop: 18, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
