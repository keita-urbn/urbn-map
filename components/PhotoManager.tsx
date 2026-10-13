import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { photoId, type DraftPhoto } from '../lib/photoGallery';
import { reorder } from '../lib/articleContent';
import { useTheme } from '../theme';
export default function PhotoManager({ images, onChange, disabled, maximum = 10, reorderable = true }: { images: DraftPhoto[]; onChange: (images: DraftPhoto[]) => void; disabled: boolean; maximum?: number; reorderable?: boolean }) {
  const { colors } = useTheme();
  const [error, setError] = useState(''); const [picking, setPicking] = useState(false);
  const pick = async () => {
    if (disabled || picking) return;
    setPicking(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1, selectionLimit: maximum - images.length });
      if (result.canceled) return;
      if (images.length + result.assets.length > maximum) throw new Error(`画像は${maximum}枚までです`);
      if (result.assets.some(a => !a.width || !a.height || (a.fileSize ?? 0) > 20 * 1024 * 1024)) throw new Error('20MB以下の画像を選んでください');
      onChange([...images, ...result.assets.map(a => ({ id: photoId(), storagePath: '', downloadURL: '', uri: a.uri, width: a.width, height: a.height, createdAt: Date.now(), mimeType: a.mimeType, fileSize: a.fileSize }))]);
    } catch (e) { setError((e as Error).message); } finally { setPicking(false); }
  };
  return <View style={{ gap: 10 }}>
    <Text style={{ color: colors.text }}>写真 {images.length}/{maximum}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {images.map((image, index) => <View key={image.id} style={{ gap: 6, width: 100 }}>
        <Image source={{ uri: image.uri || image.downloadURL }} contentFit="cover" style={{ width: 100, height: 120, borderRadius: 12 }} />
        <View style={{ flexDirection: 'row' }}>{reorderable && [-1, 1].map(delta => <Pressable accessibilityRole="button" accessibilityLabel={`写真${index + 1}を${delta < 0 ? '前' : '後'}へ`} key={delta} disabled={disabled || picking || index + delta < 0 || index + delta >= images.length} onPress={() => onChange(reorder(images, index, delta))} style={{ minHeight: 44, width: 28, justifyContent: 'center' }}><Text style={{ color: colors.text }}>{delta < 0 ? '←' : '→'}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel={`写真${index + 1}を削除`} disabled={disabled || picking} onPress={() => onChange(images.filter(i => i.id !== image.id))} style={{ minHeight: 44, flex: 1, justifyContent: 'center' }}><Text style={{ color: '#ef4444' }}>削除</Text></Pressable></View>
      </View>)}
    </ScrollView>
    {!!error && <Text accessibilityRole="alert" style={{ color: '#ef4444' }}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={disabled || picking || images.length >= maximum} onPress={() => void pick()} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.text }}>{picking ? '選択中…' : disabled ? '保存中…' : '＋ 写真を追加'}</Text></Pressable>
  </View>;
}
