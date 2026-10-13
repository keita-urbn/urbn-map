import DisplayText from "./ui/DisplayText";
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useShops } from '../hooks/useShops';
import { relatedShops } from '../lib/relatedShops';
import { useTheme } from '../theme';
import type { ShopDoc } from '../types/shop';
type Props = { current: ShopDoc; shops: ShopDoc[]; onSelect?: (shop: ShopDoc) => void };
export default function RelatedShopsCarousel({ current, shops, onSelect }: Props) {
  const { colors } = useTheme();
  const related = useMemo(() => relatedShops(current, shops), [current, shops]);
  if (!related.length) return null;
  return <View style={{ gap: 12, marginTop: 16 }}>
    <Text style={{ color: colors.text, fontWeight: '900', fontSize: 19 }}>関連するショップ</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
      {related.map(shop => <Pressable key={shop.id} accessibilityRole="button" accessibilityLabel={`${shop.name}の店舗詳細`} onPress={() => onSelect ? onSelect(shop) : router.replace(`/shop/${shop.id}`)} style={{ width: 190, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 8 }}>
        {shop.imageUrl ? <Image source={{ uri: shop.imageUrl }} style={{ width: '100%', height: 100, borderRadius: 12 }} /> : <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="storefront-outline" size={30} color={colors.muted} /></View>}
        <DisplayText numberOfLines={2} ellipsizeMode="tail" style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{shop.name}</DisplayText>
        <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 12 }}>{[shop.area, shop.genre].filter(Boolean).join(' · ')}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}
// Standalone detail routes reuse the live shop architecture; the map supplies
// its existing dataset directly and does not create another subscription.
export function ConnectedRelatedShops({ current }: { current: ShopDoc }) {
  const { shops } = useShops();
  return <RelatedShopsCarousel current={current} shops={shops} />;
}
