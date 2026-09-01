import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/auth";
import { dummyPurchase, dummyRestore } from "../lib/premiumPurchase";
import { useTheme } from "../theme";

function showAlert(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

const FEATURES = [
  { icon: "♡", title: "お気に入り無制限", body: "気になるショップを制限なく保存" },
  { icon: "↗", title: "経路案内無制限", body: "気になったショップへ何度でもルート案内" },
  { icon: "🔓", title: "Premium情報をすべて閲覧", body: "トレンド・在庫・サイズ感・イベントなどの限定情報をアンロック" },
];

export default function PremiumScreen() {
  const { colors } = useTheme();
  const { user, loading, isPremium, refreshPremium } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace({ pathname: "/login", params: { returnTo: "/premium" } });
    }
  }, [loading, user]);

  const purchase = async () => {
    if (!user?.uid || busy) return;
    setBusy("purchase");
    try {
      const result = await dummyPurchase(user.uid);
      if (!result.ok) {
        showAlert("エラー", result.error ?? "購入に失敗しました");
        return;
      }
      await refreshPremium();
      showAlert("βテスト有効化完了", "URBN Premiumのテスト機能が有効になりました。料金は発生しません。");
    } catch (error) {
      console.error("[premium] purchase error:", error);
      showAlert("エラー", "購入に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (!user?.uid || busy) return;
    setBusy("restore");
    try {
      const result = await dummyRestore(user.uid);
      if (!result.ok) {
        showAlert("エラー", result.error ?? "復元に失敗しました");
      } else if (result.restored) {
        await refreshPremium();
        showAlert("復元完了", "Premiumプランが復元されました");
      } else {
        showAlert("復元", "復元できる購入が見つかりませんでした");
      }
    } catch (error) {
      console.error("[premium] restore error:", error);
      showAlert("エラー", "復元に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
      setBusy(null);
    }
  };

  if (loading || !user) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: colors.muted }]}>PREMIUM</Text>
        <Text style={[styles.hero, { color: colors.text }]}>もっと自由に、{"\n"}東京のファッションを探索。</Text>

        <View style={[styles.planCard, { borderColor: colors.border }]}>
          <Text style={styles.planName}>URBN Premium</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>¥480</Text>
            <Text style={styles.period}> / 月</Text>
          </View>
          <Text style={styles.planCopy}>すべての機能を、制限なく。</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Premiumでできること</Text>
        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.featureIcon}><Text style={styles.featureIconText}>{feature.icon}</Text></View>
              <View style={styles.featureCopy}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureBody, { color: colors.muted }]}>{feature.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {isPremium ? (
          <View style={styles.activeCard}>
            <Text style={styles.activeTitle}>Premiumが有効です</Text>
            <Text style={styles.activeBody}>すべてのPremium機能をご利用いただけます。</Text>
          </View>
        ) : (
          <Pressable style={({ pressed }) => [styles.purchaseButton, pressed && { opacity: 0.85 }]} onPress={purchase} disabled={busy !== null}>
            {busy === "purchase" ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.purchaseLabel}>
                <Text style={styles.purchaseTitle}>Premiumをテストする</Text>
                <Text style={styles.purchasePrice}>¥480 / 月</Text>
              </View>
            )}
          </Pressable>
        )}
        {!isPremium && <Text style={[styles.cancelCopy, { color: colors.muted }]}>βテスト中のため料金は発生しません</Text>}

        <Pressable style={({ pressed }) => [styles.restoreButton, { borderColor: colors.border }, pressed && { opacity: 0.7 }]} onPress={restore} disabled={busy !== null}>
          {busy === "restore" ? <ActivityIndicator color={colors.text} /> : <Text style={[styles.restoreText, { color: colors.text }]}>購入を復元</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 20, paddingTop: 24 },
  eyebrow: { fontSize: 12, fontWeight: "900", letterSpacing: 1.8, marginBottom: 10 },
  hero: { fontSize: 30, lineHeight: 39, fontWeight: "900", marginBottom: 26 },
  planCard: { borderRadius: 24, borderWidth: 1, padding: 24, backgroundColor: "#161b2e", marginBottom: 32 },
  planName: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 28 },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  price: { color: "#fff", fontSize: 40, fontWeight: "900" },
  period: { color: "#aeb8d4", fontSize: 17, fontWeight: "700" },
  planCopy: { color: "#aeb8d4", fontSize: 14, fontWeight: "600", marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "900", marginBottom: 20 },
  features: { gap: 22, marginBottom: 34 },
  featureRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  featureIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#1d4ed8", alignItems: "center", justifyContent: "center" },
  featureIconText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  featureCopy: { flex: 1, paddingTop: 1 },
  featureTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  featureBody: { fontSize: 13, lineHeight: 20, fontWeight: "600" },
  purchaseButton: { minHeight: 58, borderRadius: 17, backgroundColor: "#1d4ed8", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  purchaseLabel: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  purchaseTitle: { color: "#fff", fontSize: 17, fontWeight: "900" },
  purchasePrice: { color: "#dbeafe", fontSize: 14, fontWeight: "800" },
  cancelCopy: { textAlign: "center", fontSize: 12, fontWeight: "600", marginTop: 10 },
  restoreButton: { minHeight: 50, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 18 },
  restoreText: { fontSize: 14, fontWeight: "800" },
  activeCard: { borderRadius: 17, backgroundColor: "#14532d", padding: 18, alignItems: "center" },
  activeTitle: { color: "#dcfce7", fontSize: 17, fontWeight: "900" },
  activeBody: { color: "#bbf7d0", fontSize: 13, fontWeight: "600", marginTop: 5, textAlign: "center" },
});
