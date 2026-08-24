import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/auth";
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

  const styles = useMemo(() => {
    const cardBg = colors.card ?? colors.surface ?? colors.background;
    return StyleSheet.create({
      root: { flex: 1, backgroundColor: colors.background },
      inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 14 },
      title: { fontSize: 24, fontWeight: "900", color: colors.text, textAlign: "center", marginBottom: 10 },
      input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: cardBg, paddingHorizontal: 14, fontSize: 16, color: colors.text },
      button: { height: 48, borderRadius: 14, backgroundColor: colors.text, alignItems: "center", justifyContent: "center", marginTop: 4 },
      buttonText: { color: colors.background, fontWeight: "900", fontSize: 16 },
    });
  }, [colors]);

  const handleSignUp = useCallback(async () => {
    if (busy) return;
    if (!email.trim() || !password || !confirmPassword) {
      showAlert("すべての項目を入力してください");
      return;
    }
    if (password !== confirmPassword) {
      showAlert("確認用パスワードが一致しません");
      return;
    }

    setBusy(true);
    try {
      const result = await signUp(email.trim(), password);
      if (result.ok) {
        router.replace(returnTo === "/premium" ? "/premium" : "/(tabs)");
      } else {
        showAlert(result.error ?? "アカウント作成に失敗しました");
      }
    } catch (error) {
      console.error("SIGNUP ERROR RAW:", error);
      showAlert("アカウント作成に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }, [busy, confirmPassword, email, password, returnTo, signUp]);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.title}>新規アカウント作成</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="メールアドレス" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />
        <TextInput value={password} onChangeText={setPassword} placeholder="パスワード（6文字以上）" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry textContentType="newPassword" />
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="パスワード（確認）" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry textContentType="newPassword" />
        <Pressable onPress={handleSignUp} disabled={busy} style={({ pressed }) => [styles.button, (pressed || busy) && { opacity: 0.7 }]}>
          <Text style={styles.buttonText}>{busy ? "作成中…" : "アカウントを作成"}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
