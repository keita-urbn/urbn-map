import ArticlePhotoGallery from "./ArticlePhotoGallery";
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { loadPrivateArticle } from '../lib/articlePersistence';
import { db } from '../lib/firebase';
import type { InfoArticle } from '../lib/infoArticles';
import { useTheme } from '../theme';
import ArticleContent from './ArticleContent';
/** Mounted only for entitled users; unmount drops content and disposes media on logout. */
export default function PremiumArticleContent({ article }: { article: InfoArticle }) {
  const { colors } = useTheme();
  const [content, setContent] = useState<Awaited<ReturnType<typeof loadPrivateArticle>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const request = article.contentVersion === 2 ? loadPrivateArticle(article.source, article.id) : getDoc(doc(db, article.source, article.id)).then(snap => ({ body: snap.data()?.body ?? '', bodyBlocks: [], premiumImages: [] }));
    request.then(data => { if (active) setContent(data); }).catch(() => { if (active) setError('Premiumコンテンツを読み込めませんでした'); });
    return () => { active = false; };
  }, [article.source, article.id, article.contentVersion]);
  if (!content) return <Text style={{ color: colors.muted }}>{error || 'Premiumコンテンツを読み込み中…'}</Text>;
  return <View style={{ gap: 18 }}>
    {content.bodyBlocks.length ? <ArticleContent blocks={content.bodyBlocks} images={[...article.publicImages, ...content.premiumImages]} /> : !!content.body && <Text style={{ color: colors.text, fontSize: 15, lineHeight: 25 }}>{content.body}</Text>}
    <ArticlePhotoGallery images={content.premiumImages.filter(image => !content.bodyBlocks.some(block => block.type === 'image' && block.imageId === image.id))} />
  </View>;
}
