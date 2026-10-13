import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { getDownloadURL, ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { storage } from '../lib/firebase';
import { useTheme } from '../theme';

type Props = { url?: string; path?: string; size?: number };
/** Uses the existing map-icon identity, never the cover/gallery image. */
export default function ShopIcon({ url, path, size = 60 }: Props) {
  const sourceUrl = url?.trim() ?? '';
  const sourcePath = path?.trim() ?? '';
  // A versioned source change resets loading/error state without stale images.
  return <ShopIconImage key={`${sourceUrl}:${sourcePath}`} url={sourceUrl} path={sourcePath} size={size} />;
}
function ShopIconImage({ url, path, size }: Required<Props>) {
  const { colors } = useTheme();
  const [resolved, setResolved] = useState(url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (url || !path) return;
    let active = true;
    getDownloadURL(ref(storage, path)).then(value => { if (active) setResolved(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [url, path]);
  return <View pointerEvents="none" accessible={false} style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', flexShrink: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="storefront-outline" size={Math.round(size * .45)} color={colors.muted} />
    {!!resolved && !failed && <Image source={{ uri: resolved }} contentFit="cover" cachePolicy="memory-disk" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} style={{ position: 'absolute', width: size, height: size, opacity: loaded ? 1 : 0 }} />}
  </View>;
}
