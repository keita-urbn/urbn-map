import SignupAgreement from "../components/legal/SignupAgreement";
import { currentSignupAgreement, recordAgreement } from "../lib/legalAgreements";
import MetallicBackground from "../components/MetallicBackground";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

function showAlert(message: string) {
  if (Platform.OS === "web") {
    window.alert(message);
  } else {
    Alert.alert("", message);
  }
}

export default function SignUpScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [checkedVersion, setCheckedVersion] = useState<string | null>(null);
  const [createdUid, setCreatedUid] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const agreement = currentSignupAgreement();
  const preview = __DEV__ && !agreement;
  const checkboxVersion = agreement?.id ?? (preview ? "preview" : null);
  const agreed = !!checkboxVersion && checkedVersion === checkboxVersion;
  const disabled = busy || (!!checkboxVersion && !agreed);
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => {
    const cardBg = colors.card ?? colors.surface ?? colors.background;
    return StyleSheet.create({
      root: { flex: 1, backgroundColor: colors.background },
      inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, gap: 14 },
      title: { fontSize: 24, fontWeight: "900", color: colors.text, textAlign: "center", marginBottom: 10 },
      input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, paddingHorizontal: 14, fontSize: 16, color: colors.text },
      button: { height: 48, borderRadius: 14, backgroundColor: colors.text, alignItems: "center", justifyContent: "center", marginTop: 4 },
      buttonText: { color: colors.background, fontWeight: "900", fontSize: 16 },
    });
  }, [colors]);

  const handleSignUp = useCallback(async () => {
    if (submitting.current) return;
    const acceptedAgreement = currentSignupAgreement();
    const requiredVersion = acceptedAgreement?.id ?? (preview ? "preview" : null);
    if (requiredVersion && checkedVersion !== requiredVersion) return;
    if (createdUid && !acceptedAgreement) {
      setSaveFailed(true);
      return;
    }
    if (!email.trim() || !password || !confirmPassword) {
      showAlert("すべての項目を入力してください");
      return;
    }
    if (password !== confirmPassword) {
      showAlert("確認用パスワードが一致しません");
      return;
    }

    submitting.current = true;
    setBusy(true);
    setSaveFailed(false);
    try {
      let uid = createdUid;
      if (!uid) {
        const result = await signUp(email.trim(), password);
        if (!result.ok || !result.uid) {
          showAlert(result.error ?? "アカウント作成に失敗しました");
          return;
        }
        uid = result.uid;
        if (acceptedAgreement) setCreatedUid(uid);
      }
      if (acceptedAgreement) {
        try {
          await recordAgreement(uid, acceptedAgreement);
        } catch {
          setSaveFailed(true);
          return;
        }
      }
      router.replace(returnTo === "/premium" ? "/premium" : "/(tabs)");
    } catch (error) {
      console.error("SIGNUP ERROR RAW:", error);
      showAlert("アカウント作成に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }, [checkedVersion, confirmPassword, createdUid, email, password, preview, returnTo, signUp]);

  return (
    <View style={styles.root}>
      <MetallicBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[
          styles.inner, { paddingTop: 20, paddingBottom: Math.max(20, insets.bottom) },
        ]}>
          <Text style={styles.title}>新規アカウント作成</Text>
          <TextInput editable={!busy && !createdUid} value={email} onChangeText={setEmail} placeholder="メールアドレス" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />
          <TextInput editable={!busy && !createdUid} value={password} onChangeText={setPassword} placeholder="パスワード（6文字以上）" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry textContentType="newPassword" />
          <TextInput editable={!busy && !createdUid} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="パスワード（確認）" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry textContentType="newPassword" />
          {!!checkboxVersion && <SignupAgreement checked={agreed} onChange={(checked) => setCheckedVersion(checked ? checkboxVersion : null)} disabled={busy} preview={preview} />}
          {saveFailed && <Text accessibilityRole="alert" style={{ color: colors.text }}>
            アカウントは作成されましたが、同意・確認の記録を保存できませんでした。再試行してください。
          </Text>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={handleSignUp} disabled={disabled} style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: 0.7 }]}>
            <Text style={styles.buttonText}>{busy ? "処理中…" : createdUid ? "同意記録を再試行" : "アカウントを作成"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
