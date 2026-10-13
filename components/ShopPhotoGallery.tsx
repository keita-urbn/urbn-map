import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import type { Photo } from '../lib/photoGallery';
/** Shared side-by-side portrait layout. Protected article media supplies its own renderer. */
export function HorizontalPhotoGallery<T>({ items, itemKey, renderPhoto }: { items: T[]; itemKey: (item: T) => string; renderPhoto: (item: T, width: number) => ReactNode }) {
  const [width, setWidth] = useState(0);
  if (!items.length) return null;
  const photoWidth = Math.max(1, (width - 16) / 2.25);
  return <View onLayout={event => { const value = event.nativeEvent.layout.width; setWidth(old => old === value ? old : value); }}>
    {!!width && <FlatList horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} data={items} keyExtractor={itemKey} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={3} ItemSeparatorComponent={() => <View style={{ width: 8 }} />} renderItem={({ item }) => <View style={{ width: photoWidth, aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden' }}>{renderPhoto(item, photoWidth)}</View>} />}
  </View>;
}
export default function ShopPhotoGallery({ images }: { images: Photo[] }) {
  const [failed, setFailed] = useState<string[]>([]);
  return <HorizontalPhotoGallery items={images.filter(i => !failed.includes(i.downloadURL))} itemKey={i => `${i.id}:${i.downloadURL}`} renderPhoto={image => <Image source={{ uri: image.downloadURL }} contentFit="cover" cachePolicy="memory-disk" style={{ width: '100%', height: '100%' }} onError={() => setFailed(previous => [...previous, image.downloadURL])} />} />;
}
