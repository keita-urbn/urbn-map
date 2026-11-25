import { useState } from "react";
import { Linking, Pressable, Text } from "react-native";
import { LegalPage } from "../components/legal/LegalDocumentScreen";
import { supportConfig, supportEmailLink } from "../content/legal/metadata";
import { useTheme } from "../theme";

const categories = [
  "アプリの利用に関するお問い合わせ",
  "店舗掲載情報の訂正",
  "不適切な投稿・権利侵害に関するお問い合わせ",
  "プライバシー・個人情報に関するお問い合わせ",
];

export default function SupportScreen() {
  const { colors } = useTheme();
  const [mailError, setMailError] = useState(false);
  const configured = !!supportEmailLink(supportConfig.email, "");
  return (
    <LegalPage heading="SUPPORT" title="お問い合わせ">
      <Text style={{ color: colors.text, lineHeight: 26, marginBottom: 16 }}>
        {configured ? supportConfig.email : "公式お問い合わせ先は準備中です。"}
      </Text>
      {categories.map((category) => {
        const href = supportEmailLink(supportConfig.email, category);
        const label = <Text style={{ color: colors.text, fontSize: 15, lineHeight: 25, paddingVertical: 12 }}>{category}</Text>;
        return href ? (
          <Pressable key={category} accessibilityRole="link" onPress={() => {
            setMailError(false);
            void Linking.openURL(href).catch(() => setMailError(true));
          }} style={{ minHeight: 44, borderBottomWidth: 1, borderColor: colors.border }}>
            {label}
          </Pressable>
        ) : <Text key={category} style={{ color: colors.muted, fontSize: 15, lineHeight: 25, marginBottom: 10 }}>{category}</Text>;
      })}
      {mailError && <Text accessibilityRole="alert" style={{ color: colors.text, marginTop: 12 }}>メールアプリを開けませんでした。表示されているメールアドレスをご利用ください。</Text>}
    </LegalPage>
  );
}
