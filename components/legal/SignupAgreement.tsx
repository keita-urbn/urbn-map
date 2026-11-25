import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { legalLinks } from "../../content/legal/metadata";
import { useTheme } from "../../theme";
import AgreementCheckbox from "./AgreementCheckbox";

export default function SignupAgreement({ checked, onChange, disabled, preview }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  preview?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      {preview && <Text style={{ color: colors.muted, fontSize: 12 }}>Draft 0.1 · 同意画面のプレビュー（記録されません）</Text>}
      <View style={styles.group}>
        <AgreementCheckbox label="利用規約に同意し、プライバシーポリシーを確認しました。"
          visualLabel="" checked={checked} onChange={onChange} disabled={disabled}
          style={{ width: 44, justifyContent: "center" }} />
        <View style={styles.row}>
          {disabled
            ? <Text style={[styles.link, { color: colors.muted }]}>{legalLinks[0].title}</Text>
            : <Link push href={legalLinks[0].href} style={[styles.link, { color: colors.text }]}>{legalLinks[0].title}</Link>}
          <Text style={{ color: colors.text }}>に同意し、</Text>
          {disabled
            ? <Text style={[styles.link, { color: colors.muted }]}>{legalLinks[1].title}</Text>
            : <Link push href={legalLinks[1].href} style={[styles.link, { color: colors.text }]}>{legalLinks[1].title}</Link>}
          <Text style={{ color: colors.text }}>を確認しました。</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", alignItems: "flex-start" },
  row: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  link: { textDecorationLine: "underline", fontSize: 14, lineHeight: 20, paddingVertical: 12 },
});
