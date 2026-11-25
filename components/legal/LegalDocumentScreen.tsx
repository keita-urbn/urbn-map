import { type ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { legalBlocks, type LegalDocument } from "../../content/legal/metadata";
import { useTheme } from "../../theme";
import MetallicBackground from "../MetallicBackground";
import DisplayText from "../ui/DisplayText";

export function LegalPage({ heading, title, onBack, children }: {
  heading: string;
  title: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const goBack = onBack ?? (() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/account");
  });

  return (
    <View style={[styles.page, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <MetallicBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.column, { paddingHorizontal: width < 380 ? 20 : 28 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="戻る" onPress={goBack} style={styles.back}>
            <Text style={{ color: colors.text }}>‹ 戻る</Text>
          </Pressable>
          <DisplayText accessibilityRole="header" style={{ color: colors.text, fontSize: width < 380 ? 38 : 48 }}>{heading}</DisplayText>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export default function LegalDocumentScreen({ document, onBack }: { document: LegalDocument; onBack?: () => void }) {
  const { colors } = useTheme();
  return (
    <LegalPage heading={document.heading} title={document.title} onBack={onBack}>
      <Text style={[styles.meta, { color: colors.muted }]}>{document.sourceTitle}</Text>
      <Text style={[styles.meta, { color: colors.text }]}>
        {document.status === "draft" ? "Draft 0.1 · 未承認" : `Version ${document.version}`}
        {"\n"}制定日：{document.effectiveDate ?? "[正式公開日]"}
      </Text>
      <View style={[styles.rule, { borderColor: colors.border }]} />
      {legalBlocks(document.source).map(({ kind, text }, index) => {
        if (kind === "rule") return <View key={index} style={[styles.rule, { borderColor: colors.border }]} />;
        if (kind === "heading" || kind === "subheading") {
          return <Text key={index} accessibilityRole="header" style={[
            kind === "heading" ? styles.heading : styles.subheading, { color: colors.text },
          ]}>{text}</Text>;
        }
        const marker = kind === "list" ? /^(\S+) (.+)$/.exec(text) : null;
        if (marker) {
          return <View key={index} style={styles.listRow}>
            <Text style={[styles.body, styles.marker, { color: colors.text }]}>{marker[1]}</Text>
            <Text style={[styles.body, styles.item, { color: colors.text }]}>{marker[2]}</Text>
          </View>;
        }
        return <Text key={index} style={[styles.body, styles.paragraph, { color: colors.text }]}>{text}</Text>;
      })}
    </LegalPage>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { width: "100%", maxWidth: 768, alignSelf: "center" },
  back: { minHeight: 44, minWidth: 60, alignSelf: "flex-start", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  meta: { fontSize: 13, lineHeight: 22, marginBottom: 10 },
  rule: { borderTopWidth: 1, marginVertical: 18 },
  body: { fontSize: 15, lineHeight: 26 },
  paragraph: { marginBottom: 14 },
  heading: { fontSize: 19, fontWeight: "800", lineHeight: 28, marginTop: 16, marginBottom: 12 },
  subheading: { fontSize: 16, fontWeight: "700", lineHeight: 25, marginTop: 10, marginBottom: 8 },
  listRow: { flexDirection: "row", paddingLeft: 6, marginBottom: 6 },
  marker: { minWidth: 29 },
  item: { flex: 1 },
});
