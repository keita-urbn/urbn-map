import ShopPhotoGallery from "../../components/ShopPhotoGallery";
import ArticlePhotoGallery from "../../components/ArticlePhotoGallery";
import ArticleContent from "../../components/ArticleContent";
import { removeArticle } from "../../lib/articlePersistence";
import PremiumArticleContent from "../../components/PremiumArticleContent";
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { StructuredPostCard } from '../../components/InfoChatFeed';
import MetallicBackground from '../../components/MetallicBackground';
import { useAuth } from '../../context/auth';
import { db } from '../../lib/firebase';
import { ARTICLE_SOURCES, mapInfoArticle, type InfoArticle } from '../../lib/infoArticles';
import { useTheme } from '../../theme';
export default function ArticleDetail() {
  const { source, id } = useLocalSearchParams<{ source: string; id: string }>();
  const { user, isPremium, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const [article, setArticle] = useState<InfoArticle | null>(null);
  const [now] = useState(() => Date.now());
  const canRead = !!user && (isPremium || isAdmin);
  const accessKey = `${source}:${id}:${user?.uid}:${canRead}`;
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ARTICLE_SOURCES.includes(source) || !id) return;
    return onSnapshot(doc(db, source, id), snap => { if (snap.exists()) setArticle(mapInfoArticle(snap.id, source, snap.data(), false)); else setError('記事が見つかりません'); }, () => setError('記事を読み込めませんでした'));
  }, [source, id, canRead]);
  const remove = async () => {
    try { const failed = await removeArticle(source, id, article?.publicImages ?? []); if (failed) setError("記事を削除しました。Storage画像の削除に再試行が必要です"); else router.back(); }
    catch { setError('削除に失敗しました'); }
  };
  const confirmDelete = () => {
    if (Platform.OS === 'web') { if (window.confirm('この記事を削除しますか？')) void remove(); }
    else Alert.alert('削除', 'この記事を削除しますか？', [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => void remove() }]);
  };
  const visible = article && (isAdmin || article.published && article.publishedAt <= now);
  return <View style={{ flex: 1, backgroundColor: colors.background }}><MetallicBackground />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
      {!!error && <Text accessibilityRole="alert" style={{ color: '#ef4444' }}>{error}</Text>}
      {visible ? <>
        <Text style={{ color: colors.muted }}>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('ja-JP') : ''}</Text>
        <StructuredPostCard post={{ ...article, body: canRead ? "" : "Premium限定コンテンツ" }} canReadBody={canRead} publicContent={<View style={{ gap: 16 }}><ShopPhotoGallery images={article.legacyPublicImages} /><ArticleContent blocks={article.publicBlocks} images={article.publicImages} /><ArticlePhotoGallery images={article.publicImages.filter(image => article.publicGalleryImageIds.includes(image.id) && !article.publicBlocks.some(block => block.type === 'image' && block.imageId === image.id))} /></View>} bodyContent={canRead ? <PremiumArticleContent key={accessKey} article={article} /> : undefined} isAdmin={isAdmin} isDark={isDark} colors={colors} onDelete={confirmDelete} premiumCtaLabel={user ? 'Premiumでアンロック' : 'ログインしてPremiumになる'} onPremiumCTA={() => { if (user) router.push('/premium'); else router.push({ pathname: '/login', params: { returnTo: '/premium' } }); }} />
        {isAdmin && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/admin/add-post', params: { source, id } })} style={{ padding: 14 }}><Text style={{ color: colors.text }}>記事を編集</Text></Pressable>}
      </> : !error && <Text style={{ color: colors.muted }}>{article ? 'この記事は公開されていません' : '読み込み中…'}</Text>}
    </ScrollView>
  </View>;
}
