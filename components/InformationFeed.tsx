import ShopPhotoGallery from "./ShopPhotoGallery";
import ArticlePhotoGallery from "./ArticlePhotoGallery";
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/auth';
import { useInfoArticles } from '../hooks/useInfoArticles';
import { filterInfoArticles, INFO_CATEGORIES, type InfoCategory } from '../lib/infoArticles';
import { useTheme } from '../theme';
import MetallicBackground from './MetallicBackground';
import NotificationBell from './NotificationBell';
import DisplayText from './ui/DisplayText';
export default function InformationFeed({ initialCategory = 'all', contentInsets }: { initialCategory?: InfoCategory | 'all'; contentInsets: { paddingTop?: number; paddingBottom?: number; paddingHorizontal?: number; paddingLeft?: number; paddingRight?: number } }) {
  const { colors } = useTheme();
  const { isAdmin } = useAuth();
  const { articles, loading, error } = useInfoArticles();
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterInfoArticles(articles, category, search), [articles, category, search]);
  return <View style={{ flex: 1, backgroundColor: colors.background }}><MetallicBackground />
    <FlatList data={filtered} keyExtractor={a => `${a.source}:${a.id}`} contentContainerStyle={[{ paddingHorizontal: 16, gap: 14 }, contentInsets]} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={{ gap: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><DisplayText style={{ color: colors.text, fontSize: 30 }}>INFORMATION</DisplayText><NotificationBell /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{[{ key: 'all', label: 'All' }, ...INFO_CATEGORIES].map(c => <Pressable key={c.key} accessibilityRole="button" accessibilityState={{ selected: category === c.key }} onPress={() => setCategory(c.key as InfoCategory | 'all')} style={{ borderRadius: 20, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: category === c.key ? '#ef444424' : colors.surface }}><Text style={{ color: category === c.key ? '#ef4444' : colors.text }}>{c.label}</Text></Pressable>)}</ScrollView>
        <TextInput accessibilityLabel="記事検索" value={search} onChangeText={setSearch} placeholder="タイトル・タグで検索…" placeholderTextColor={colors.muted} autoCapitalize="none" style={{ minHeight: 44, borderRadius: 14, padding: 14, color: colors.text, backgroundColor: colors.surface }} />
        {isAdmin && <Pressable accessibilityRole="button" onPress={() => router.push('/admin/add-post')} style={{ paddingVertical: 12 }}><Text style={{ color: colors.text }}>＋ 記事を投稿</Text></Pressable>}
        {!!error && <Text accessibilityRole="alert" style={{ color: '#ef4444' }}>{error}</Text>}
      </View>}
      ListEmptyComponent={<Text style={{ color: colors.muted, padding: 16 }}>{loading ? '読み込み中…' : search ? '検索結果なし' : 'まだ投稿がありません'}</Text>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/info/article', params: { source: item.source, id: item.id } })} style={{ backgroundColor: colors.card ?? colors.surface, borderRadius: 18, padding: 18, gap: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{INFO_CATEGORIES.find(c => c.key === item.kind)?.label} · {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('ja-JP') : ''}</Text>
        <DisplayText numberOfLines={3} style={{ color: colors.text, fontSize: 24 }}>{item.title}</DisplayText>
        <ShopPhotoGallery images={item.legacyPublicImages} />
        <ArticlePhotoGallery images={item.publicImages.filter(image => item.publicGalleryImageIds.includes(image.id) && !item.publicBlocks.some(b => b.type === "image" && b.imageId === image.id))} />
        {!!item.abstract && <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{item.abstract}</Text>}
        {!!item.hashtags.length && <Text style={{ color: colors.muted, fontSize: 12 }}>{item.hashtags.join(' ')}</Text>}
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>View Details →</Text>
      </Pressable>} />
  </View>;
}
