// app/login.tsx
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useAuth } from "../context/auth";
import { dummyRestore } from "../lib/premiumPurchase";
import { useTheme } from "../theme";

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDate(ts: number | null): string {
  if (!ts) return "–";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/** Returns premiumSince + 1 calendar month as a display string. */
function nextBillingDate(premiumSince: number | null): string {
  if (!premiumSince) return "–";
  const d = new Date(premiumSince);
  d.setMonth(d.getMonth() + 1);
  return formatDate(d.getTime());
}

function showAlert(title: string, body: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n${body}`);
  } else {
    Alert.alert(title, body);
  }
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const { user, isPremium, premiumSince, plan, signIn, signUp, signOut, refreshPremium } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const cardBg = colors.card ?? colors.surface ?? colors.background;

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("", "メールアドレスとパスワードを入力してください");
      return;
    }
    setBusy(true);
    try {
      const res = await signIn(email.trim(), password);
      setBusy(false);
      if (res.ok) {
        router.back();
      } else {
        Alert.alert("", res.error ?? "ログインに失敗しました");
      }
    } catch (error: any) {
      setBusy(false);
      console.error("LOGIN ERROR RAW:", error);
      Alert.alert(
        "Auth error",
        `${error?.code ?? "no-code"}\n${error?.message ?? String(error)}`,
      );
    }
  }, [email, password, signIn]);

  const handleSignUp = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("", "メールアドレスとパスワードを入力してください");
      return;
    }
    setBusy(true);
    const res = await signUp(email.trim(), password);
    setBusy(false);
    if (res.ok) {
      router.back();
    } else {
      Alert.alert("", res.error ?? "アカウント作成に失敗しました");
    }
  }, [email, password, signUp]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    Alert.alert("", "ログアウトしました");
  }, [signOut]);

  const handleRestore = useCallback(async () => {
    if (!user?.uid) return;
    setRestoreBusy(true);
    try {
      const result = await dummyRestore(user.uid);
      if (!result.ok) {
        showAlert("エラー", result.error ?? "復元に失敗しました");
        return;
      }
      if (result.restored) {
        await refreshPremium();
        showAlert("復元完了", "Premiumプランが復元されました");
      } else {
        showAlert("復元", "復元できる購入が見つかりませんでした");
      }
    } catch (e: any) {
      showAlert("エラー", e?.message ?? "復元に失敗しました");
    } finally {
      setRestoreBusy(false);
    }
  }, [user?.uid, refreshPremium]);

  const handleManageSubscription = useCallback(() => {
    showAlert(
      "サブスクリプション管理",
      "本番版ではここからサブスクリプション管理画面に移動できます",
    );
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        inner: {
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          gap: 14,
        },
        title: {
          fontSize: 24,
          fontWeight: "900",
          color: colors.text,
          textAlign: "center",
          marginBottom: 10,
        },
        input: {
          height: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: cardBg,
          paddingHorizontal: 14,
          fontSize: 16,
          color: colors.text,
        },
        btnSolid: {
          height: 48,
          borderRadius: 14,
          backgroundColor: colors.text,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 4,
        },
        btnSolidText: {
          color: colors.background,
          fontWeight: "900",
          fontSize: 16,
        },
        btnOutline: {
          height: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        btnOutlineText: {
          color: colors.text,
          fontWeight: "800",
          fontSize: 16,
        },
        // ── Account screen ────────────────────────────────────────────────
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48, gap: 20 },
        sectionLabel: {
          fontSize: 11,
          fontWeight: "800",
          color: colors.muted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 6,
          marginLeft: 4,
        },
        card: {
          backgroundColor: cardBg,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 14,
          paddingHorizontal: 16,
        },
        rowDivider: {
          height: 1,
          backgroundColor: colors.border,
          marginHorizontal: 16,
        },
        rowLabel: {
          fontSize: 15,
          fontWeight: "700",
          color: colors.text,
        },
        rowValue: {
          fontSize: 15,
          fontWeight: "600",
          color: colors.muted,
        },
        planBadge: {
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 20,
        },
        planBadgeText: {
          fontSize: 13,
          fontWeight: "900",
        },
        actionRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 15,
          paddingHorizontal: 16,
        },
        actionText: {
          fontSize: 15,
          fontWeight: "700",
        },
        actionChevron: {
          fontSize: 16,
          color: colors.muted,
          marginLeft: "auto" as any,
        },
        emailText: {
          fontSize: 13,
          fontWeight: "600",
          color: colors.muted,
          textAlign: "center",
        },
        logoutCard: {
          backgroundColor: cardBg,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "#ef444433",
          overflow: "hidden",
        },
        logoutText: {
          fontSize: 15,
          fontWeight: "800",
          color: "#ef4444",
        },
      }),
    [colors, cardBg],
  );

  // ── Already signed in — full account screen ───────────────────────────────
  if (user) {
    const planLabel = isPremium ? "Premium" : "Free";
    const planBg = isPremium ? "#1d4ed820" : colors.surface;
    const planColor = isPremium ? "#60a5fa" : colors.muted;

    return (
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Email */}
          <Text style={styles.emailText}>{user.email}</Text>

          {/* ── Plan info ── */}
          <View>
            <Text style={styles.sectionLabel}>プラン</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>現在のプラン</Text>
                <View style={[styles.planBadge, { backgroundColor: planBg }]}>
                  <Text style={[styles.planBadgeText, { color: planColor }]}>{planLabel}</Text>
                </View>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>開始日</Text>
                <Text style={styles.rowValue}>{formatDate(premiumSince)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>次回更新</Text>
                <Text style={styles.rowValue}>
                  {isPremium ? nextBillingDate(premiumSince) : "–"}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Subscription actions ── */}
          <View>
            <Text style={styles.sectionLabel}>サブスクリプション</Text>
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
                onPress={handleRestore}
                disabled={restoreBusy}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {restoreBusy ? "復元中…" : "購入を復元"}
                </Text>
                <Text style={styles.actionChevron}>›</Text>
              </Pressable>
              <View style={styles.rowDivider} />
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
                onPress={handleManageSubscription}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>
                  サブスクリプション管理
                </Text>
                <Text style={styles.actionChevron}>›</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Logout ── */}
          <View>
            <Text style={styles.sectionLabel}>アカウント</Text>
            <View style={styles.logoutCard}>
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
                onPress={handleSignOut}
              >
                <Text style={styles.logoutText}>ログアウト</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Login / sign-up form ──────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.title}>ログイン</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレス"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="パスワード"
          placeholderTextColor={colors.muted}
          style={styles.input}
          secureTextEntry
          textContentType="password"
        />

        <Pressable
          onPress={handleSignIn}
          disabled={busy}
          style={({ pressed }) => [
            styles.btnSolid,
            (pressed || busy) && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.btnSolidText}>
            {busy ? "処理中…" : "ログイン"}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSignUp}
          disabled={busy}
          style={({ pressed }) => [
            styles.btnOutline,
            (pressed || busy) && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.btnOutlineText}>
            {busy ? "処理中…" : "新規アカウント作成"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}