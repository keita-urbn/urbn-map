import { Text, View } from 'react-native';
import type { ShopDoc } from '../types/shop';
import { useTheme } from '../theme';
import DisplayText from './ui/DisplayText';
export function editorialSections(shop: Pick<ShopDoc, 'theVibe' | 'theSelection' | 'theExperience' | 'comment'>) {
  const sections = [['THE VIBE', shop.theVibe], ['THE SELECTION', shop.theSelection], ['THE EXPERIENCE', shop.theExperience]]
    .filter(([, text]) => text?.trim()).map(([title, text]) => ({ title: title!, text: text!.trim() }));
  const legacy = shop.comment?.trim();
  if (legacy && !sections.some(section => section.text === legacy)) sections.push({ title: sections.length ? 'ABOUT' : 'OVERVIEW', text: legacy });
  return sections;
}
export default function ShopEditorial({ shop }: { shop: ShopDoc }) {
  const { colors } = useTheme();
  return <View style={{ gap: 26 }}>{editorialSections(shop).map(section => <View key={section.title} style={{ gap: 10 }}>
    <DisplayText style={{ fontSize: 23, color: colors.text }}>{section.title}</DisplayText>
    <Text style={{ fontSize: 16, lineHeight: 26, color: colors.text, fontWeight: '400' }}>{section.text}</Text>
  </View>)}</View>;
}
