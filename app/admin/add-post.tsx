// app/admin/add-post.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { addPost, parseHashtags } from "../../lib/posts";
import { useTheme } from "../../theme";

const ABSTRACT_MAX = 200;

type Status =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function AddPostScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [abstract, setAbstract] = useState("");
  const [body, setBody] = useState("");

  const [status, setStatus] = useState<Status>({ type: "idle" });

  const navTimerRef = useRef<any>(null);
  const toastTimerRef = useRef<any>(null);

  // Toast animation
  const toastY = useRef(new Animated.Value(-20)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const canSave = useMemo(() => title.trim().length > 0, [title]);
  const saving = status.type === "saving";

  const resetForm = () => {
    setTitle("");
    setHashtags("");
    setAbstract("");
    setBody("");
  };

  const showToast = (text: string) => {
    setToastText(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    toastY.setValue(-18);
    toastOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(toastY, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(toastY, {
          toValue: -10,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200);
  };

  const onSave = async () => {
    if (saving) return;

    if (!canSave) {
      setStatus({ type: "error", message: "タイトルを入力してください。" });
      return;
    }

    setStatus({ type: "saving" });

    try {
      await addPost({
        title: title.trim(),
        hashtags: parseHashtags(hashtags),
        abstract: abstract.trim(),
        body: body.trim(),
        authorRole: "admin",
      });

      showToast("✅ 投稿完了：記事を追加しました");
      setStatus({ type: "success", message: "投稿完了。" });
      resetForm();

      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        router.back();
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setStatus({ type: "error", message: String(e?.message ?? e) });
    }
  };

  return (
    <View style={styles.page}>
      {/* Toast */}
      {!!toastText && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastY }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastText}</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>記事投稿</Text>

        {/* Status banner */}
        {status.type !== "idle" && (
          <View
            style={[
              styles.statusBox,
              status.type === "success"
                ? styles.statusOk
                : status.type === "error"
                  ? styles.statusNg
                  : styles.statusMid,
            ]}
          >
            <Text style={styles.statusText}>
              {status.type === "saving" ? "保存中..." : status.message}
            </Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="記事のタイトル"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
        />

        {/* Hashtags */}
        <Text style={styles.label}>Hashtags</Text>
        <TextInput
          style={styles.input}
          placeholder="#tokyo, #selectshop, #streetwear"
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
          <Text style={styles.label}>Abstract</Text>
          <Text
            style={[
              styles.charCounter,
              abstract.length > ABSTRACT_MAX && styles.charCounterOver,
            ]}
          >
            {abstract.length}/{ABSTRACT_MAX}
          </Text>
        </View>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="記事の概要（プレビュー用）"
          placeholderTextColor={colors.muted}
          value={abstract}
          onChangeText={(t) => setAbstract(t.slice(0, ABSTRACT_MAX))}
          multiline
          maxLength={ABSTRACT_MAX}
        />

        {/* Body */}
        <Text style={styles.label}>Body</Text>
        <TextInput
          style={[styles.input, styles.bodyInput]}
          placeholder="記事の本文（プレミアムユーザー限定コンテンツ）"
          placeholderTextColor={colors.muted}
          value={body}
          onChangeText={setBody}
          multiline
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.primaryBtn, (!canSave || saving) && styles.disabled]}
          onPress={onSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? "投稿中..." : "投稿する"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  const toastBg = "#16a34a";
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background },

    toast: {
      position: "absolute",
      top: 10,
      left: 10,
      right: 10,
      zIndex: 9999,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: toastBg,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)",
    },
    toastText: {
      color: "#fff",
      fontWeight: "900",
      fontSize: 14,
      textAlign: "center",
    },

    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 14, paddingBottom: 40, gap: 10, paddingTop: 58 },

    screenTitle: {
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 6,
      color: colors.text,
    },

    statusBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.surface,
      gap: 10,
    },
    statusOk: { opacity: 1 },
    statusNg: { opacity: 1 },
    statusMid: { opacity: 1 },
    statusText: { fontWeight: "800", color: colors.text },

    label: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      marginTop: 4,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    charCounter: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.muted,
    },
    charCounterOver: {
      color: "#ef4444",
    },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    multiline: { minHeight: 90, textAlignVertical: "top" },
    bodyInput: { minHeight: 180, textAlignVertical: "top" },

    tagPreview: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 2,
    },
    tag: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tagText: {
      fontSize: 13,
      fontWeight: "700",
    },

    primaryBtn: {
      marginTop: 8,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.text,
    },
    primaryBtnText: { fontSize: 15, fontWeight: "900", color: colors.background },

    disabled: { opacity: 0.5 },
  });
}
