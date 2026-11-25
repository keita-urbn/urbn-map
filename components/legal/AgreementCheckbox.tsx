import { Pressable, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme";

export default function AgreementCheckbox({ checked, onChange, label, visualLabel = label, disabled, style }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  visualLabel?: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }}
      disabled={disabled} onPress={() => onChange(!checked)}
      style={[{ minHeight: 44, flexDirection: "row", gap: 9, alignItems: "center" }, style]}>
      <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: colors.text, alignItems: "center", justifyContent: "center" }}>
        {checked && <Text style={{ color: colors.text }}>✓</Text>}
      </View>
      {!!visualLabel && <Text style={{ color: colors.text, fontSize: 14, flexShrink: 1 }}>{visualLabel}</Text>}
    </Pressable>
  );
}
