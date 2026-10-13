import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Pressable, Text, TextInput, View } from 'react-native';
import { contentId, removeImageReferences, reorder, type ArticleBlock } from '../lib/articleContent';
import type { DraftArticleImage } from '../lib/articlePersistence';
import { useTheme } from '../theme';
import { ArticleMedia } from './ArticleContent';
export function ArticleImageManager({ access, images, onChange, onRemove, disabled, onError }: { access: 'public' | 'premium'; images: DraftArticleImage[]; onChange: (images: DraftArticleImage[]) => void; onRemove: (id: string) => void; disabled: boolean; onError: (error: string) => void }) {
  const { colors } = useTheme();
  const select = async (replaceId?: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: !replaceId, quality: 1 });
      if (result.canceled || !result.assets.length) return;
      if (!replaceId && images.length + result.assets.length > 10) throw new Error("記事の画像は合計10枚までです");
      const additions = result.assets.map(a => ({ id: replaceId ?? contentId(), path: '', access, uri: a.uri, width: a.width, height: a.height, mimeType: a.mimeType, fileSize: a.fileSize }));
      if (additions.some(a => !a.width || !a.height || (a.fileSize ?? 0) > 20 * 1024 * 1024)) throw new Error('20MB以下の画像を選んでください');
      onChange(replaceId ? images.map(i => i.id === replaceId ? additions[0] : i) : [...images, ...additions]);
    } catch (e) { onError((e as Error).message); }
  };
  const selected = images.filter(i => i.access === access);
  return <View style={{ gap: 12 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{access === 'public' ? 'Public Images' : 'Premium Images'}</Text>
    {selected.map(image => <View key={image.id} style={{ gap: 8 }}>
      <View style={{ width: '100%', maxWidth: 240 }}>{image.uri ? <Image source={{ uri: image.uri }} style={{ width: '100%', aspectRatio: image.width / image.height }} contentFit="contain" /> : <ArticleMedia image={image} />}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[['変更', () => void select(image.id)], ['削除', () => onRemove(image.id)], ['↑', () => onChange([...images.filter(i => i.access !== access), ...reorder(selected, selected.indexOf(image), -1)])], ['↓', () => onChange([...images.filter(i => i.access !== access), ...reorder(selected, selected.indexOf(image), 1)])]].map(([label, action]) => <Pressable key={label as string} accessibilityRole="button" disabled={disabled} onPress={action as () => void} style={{ minHeight: 44, padding: 12, backgroundColor: colors.surface, borderRadius: 12 }}><Text style={{ color: colors.text }}>{label as string}</Text></Pressable>)}</View>
    </View>)}
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void select()} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: colors.text }}>＋ 画像を追加</Text></Pressable>
  </View>;
}
export default function ArticleBlockEditor({ label, blocks, images, onChange, disabled }: { label: string; blocks: ArticleBlock[]; images: DraftArticleImage[]; onChange: (blocks: ArticleBlock[]) => void; disabled: boolean }) {
  const { colors } = useTheme();
  return <View style={{ gap: 12 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
    {blocks.map((block, index) => <View key={block.id} style={{ padding: 12, gap: 8, borderRadius: 14, backgroundColor: colors.surface }}>
      {block.type === 'text' ? <TextInput accessibilityLabel={`${label} テキスト ${index + 1}`} editable={!disabled} multiline value={block.text} onChangeText={text => onChange(blocks.map(b => b.id === block.id ? { ...block, text } : b))} style={{ minHeight: 80, color: colors.text, textAlignVertical: 'top', lineHeight: 24 }} /> : <Text style={{ color: colors.muted }}>画像: {block.imageId} ({block.access})</Text>}
      <View style={{ flexDirection: 'row', gap: 16 }}>{[['↑', () => onChange(reorder(blocks, index, -1))], ['↓', () => onChange(reorder(blocks, index, 1))], ['削除', () => onChange(blocks.filter(b => b.id !== block.id))]].map(([text, action]) => <Pressable accessibilityRole="button" disabled={disabled} key={text as string} onPress={action as () => void} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: colors.text }}>{text as string}</Text></Pressable>)}</View>
    </View>)}
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => onChange([...blocks, { id: contentId(), type: 'text', text: '' }])} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: colors.text }}>＋ テキスト</Text></Pressable>
    {images.map((image, index) => <Pressable key={image.id} accessibilityRole="button" disabled={disabled} onPress={() => onChange([...blocks, { id: contentId(), type: 'image', imageId: image.id, access: image.access }])} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: colors.text }}>＋ 画像 {index + 1} ({image.access})</Text></Pressable>)}
  </View>;
}
export { removeImageReferences };
