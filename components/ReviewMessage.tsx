import ReviewStackedPhotoCarousel from "./ReviewStackedPhotoCarousel";
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';
import type { ReviewDoc } from '../types/review';
export function ReviewAvatar({ uri }: { uri?: string | null }) {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <View accessible={false} style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {uri && failedUri !== uri ? <Image source={{ uri }} style={{ width: 36, height: 36 }} contentFit="cover" cachePolicy="memory-disk" onError={() => setFailedUri(uri)} /> : <Ionicons name="person-outline" color={colors.muted} size={19} />}
  </View>;
}
export default function ReviewMessage({ review, name, photoUrl, onDelete }: { review: ReviewDoc; name?: string | null; photoUrl?: string | null; onDelete?: () => void }) {
  const { colors } = useTheme();
  const date = review.createdAt?.toDate?.();
  const dateText = date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('ja-JP') : '';
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
    <ReviewAvatar uri={review.photoURL || photoUrl} />
    <View style={{ flex: 1, minWidth: 0, borderRadius: 18, borderTopLeftRadius: 5, padding: 16, gap: 10, backgroundColor: colors.card ?? colors.surface }}>
      <View style={{ gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{review.displayName?.trim() || name?.trim() || 'URBn メンバー'}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{dateText}</Text>
      </View>
      <Text accessibilityLabel={`${review.rating} / 5`} style={{ color: colors.text, fontSize: 13 }}>{'★'.repeat(Math.max(0, Math.min(5, Math.round(review.rating))))} <Text style={{ color: colors.muted }}>{review.rating} / 5</Text></Text>
      {!!review.text && <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24 }}>{review.text}</Text>}
      <ReviewStackedPhotoCarousel images={review.images ?? []} />
      {onDelete && <Pressable accessibilityRole="button" accessibilityLabel="自分のレビューを削除" onPress={onDelete} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: '#ef4444', fontSize: 13 }}>削除</Text></Pressable>}
    </View>
  </View>;
}
