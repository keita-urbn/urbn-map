import { Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme';
export type EditorialDraft = { theVibe: string; theSelection: string; theExperience: string };
export const EMPTY_EDITORIAL: EditorialDraft = { theVibe: '', theSelection: '', theExperience: '' };
export default function ShopEditorialEditor({ value, onChange, disabled }: { value: EditorialDraft; onChange: (value: EditorialDraft) => void; disabled: boolean }) {
  const { colors } = useTheme();
  const fields = [ ['theVibe', 'THE VIBE', '雰囲気・コンセプト・ファッションの方向性'], ['theSelection', 'THE SELECTION', '取り扱うスタイル・ブランド・商品の特徴'], ['theExperience', 'THE EXPERIENCE', '店内での体験・訪れる魅力・発見できること'] ] as const;
  return <View style={{ gap: 14 }}>{fields.map(([key, label, placeholder]) => <View key={key} style={{ gap: 6 }}>
    <Text style={{ color: colors.text, fontWeight: '700' }}>{label}（任意）</Text>
    <TextInput accessibilityLabel={label} editable={!disabled} multiline value={value[key]} onChangeText={text => onChange({ ...value, [key]: text })} placeholder={placeholder} placeholderTextColor={colors.muted} style={{ minHeight: 100, padding: 12, textAlignVertical: 'top', borderRadius: 12, backgroundColor: colors.surface, color: colors.text, fontSize: 15, lineHeight: 23 }} />
  </View>)}</View>;
}
