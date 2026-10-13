import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { type ArticleBlock, type ArticleImage } from '../lib/articleContent';
import { readArticleImage } from '../lib/articleStorage';
import { useTheme } from '../theme';
type MediaProps = { image: ArticleImage; portrait?: boolean; onFailure?: (image: ArticleImage) => void };
export function ArticleMedia(props: MediaProps) {
  return <ArticleMediaImage key={`${props.image.path}:${props.image.access}`} {...props} />;
}
function ArticleMediaImage({ image, portrait, onFailure }: MediaProps) {
  const { colors } = useTheme();
  const [uri, setUri] = useState(''); const [error, setError] = useState(false);
  useEffect(() => {
    let active = true; let dispose: (() => void) | undefined;
    readArticleImage(image).then(result => { if (!active) result.dispose(); else { dispose = result.dispose; setUri(result.uri); } }).catch(() => { if (active) { setError(true); onFailure?.(image); } });
    return () => { active = false; dispose?.(); };
  }, [image, onFailure]);
  return <View style={{ width: '100%', aspectRatio: portrait ? 3 / 4 : image.width / image.height || 1, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface, justifyContent: 'center' }}>
    {uri ? <Image source={{ uri }} onError={() => { setError(true); setUri(""); onFailure?.(image); }} contentFit="cover" cachePolicy={image.access === 'premium' ? 'none' : 'memory-disk'} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: colors.muted, padding: 12 }}>{error ? '画像を読み込めませんでした' : '画像を読み込み中…'}</Text>}
  </View>;
}
export default function ArticleContent({ blocks, images, localPreviews = {} }: { blocks: ArticleBlock[]; images: ArticleImage[]; localPreviews?: Record<string, string> }) {
  const { colors } = useTheme();
  return <View style={{ gap: 18 }}>{blocks.map(b => b.type === 'text' ? <Text key={b.id} style={{ color: colors.text, fontSize: 15, lineHeight: 25 }}>{b.text}</Text> : localPreviews[b.imageId] ? <Image key={b.id} source={{ uri: localPreviews[b.imageId] }} contentFit="contain" style={{ width: '100%', aspectRatio: images.find(i => i.id === b.imageId)?.width! / images.find(i => i.id === b.imageId)?.height! || 1 }} /> : images.find(i => i.id === b.imageId && i.access === b.access) ? <ArticleMedia key={`${b.id}:${b.imageId}`} image={images.find(i => i.id === b.imageId && i.access === b.access)!} /> : null)}</View>;
}
