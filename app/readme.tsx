import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

export default function ReadmeScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView style={{ backgroundColor: colors.background }}>
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: colors.text }]}>
          セレクトショップ探索アプリ（デモ）
        </Text>

        <Text style={[styles.text, { color: colors.text }]}>
          本アプリは、セレクトショップを地図ベースで探索できるWebアプリです。
          エリア・ジャンル検索、店舗詳細の閲覧を中心に設計しています。
        </Text>

        <Text style={[styles.h, { color: colors.text }]}>デモの見どころ</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          ・地図上のピン表示と店舗一覧の同期{"\n"}
          ・検索条件変更時の即時反映{"\n"}
          ・店舗データ更新後のリアルタイム反映
          ・経路案内
        </Text>

        <Text style={[styles.h, { color: colors.text }]}>デモデータについて</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          本デモでは、以下の想定で事前に店舗データを登録しています。{"\n"}
          ・「渋谷」「中目黒」エリアの店舗{"\n"}
          ・ジャンル別に分類された複数店舗{"\n"}
          {"\n"}
          一覧・地図を操作することで、データ追加・更新後の反映結果を
          操作不要で確認できます。
        </Text>

        <Text style={[styles.h, { color: colors.text }]}>権限制御について</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          実運用では、Firestoreのセキュリティルールにより
          運営者のみが店舗の追加・編集を行う設計です。{"\n"}
          本デモはES提出用の検証環境として、閲覧体験を優先しています。
        </Text>

        <Text style={[styles.h, { color: colors.text }]}>技術スタック</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          ・Expo / React Native（Web対応）{"\n"}
          ・Expo Router{"\n"}
          ・Firebase Firestore{"\n"}
          ・Leaflet（地図表示）
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },
  h: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
});