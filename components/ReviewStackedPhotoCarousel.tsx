import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { nextPhotoIndex, type Photo } from '../lib/photoGallery';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../theme';
export default function ReviewStackedPhotoCarousel({ images }: { images: Photo[] }) {
  return <PhotoStack key={images.map(i => i.downloadURL).join('|')} images={images} />;
}
function PhotoStack({ images }: { images: Photo[] }) {
  const { colors } = useTheme(); const reduced = useReducedMotion();
  const [failed, setFailed] = useState<string[]>([]); const photos = images.filter(i => !failed.includes(i.downloadURL));
  const [index, setIndex] = useState(0); const activeIndex = Math.min(index, Math.max(0, photos.length - 1));
  const [width, setWidth] = useState(240); const [x] = useState(() => new Animated.Value(0));
  const busy = useRef(false); const latest = useRef({ index: activeIndex, count: photos.length, width, reduced });
  useEffect(() => { latest.current = { index: activeIndex, count: photos.length, width, reduced }; }, [activeIndex, photos.length, width, reduced]);
  useEffect(() => () => { x.stopAnimation(); }, [x]);
  const move = (dx: number) => {
    if (busy.current) return;
    const current = latest.current; const next = nextPhotoIndex(current.index, dx, current.count);
    if (next === current.index) { Animated.spring(x, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(); return; }
    busy.current = true;
    if (current.reduced) { setIndex(next); latest.current.index = next; x.setValue(0); busy.current = false; return; }
    const sign = dx < 0 ? -1 : 1;
    Animated.timing(x, { toValue: sign * current.width, duration: 160, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (!finished) { busy.current = false; return; }
      x.setValue(-sign * current.width); setIndex(next); latest.current.index = next;
      Animated.spring(x, { toValue: 0, damping: 24, stiffness: 220, mass: 1, useNativeDriver: Platform.OS !== 'web' }).start(() => { busy.current = false; });
    });
  };
  const moveRef = useRef(move); useEffect(() => { moveRef.current = move; });
  // Refs below are only read inside responder callbacks, never during render.
  // eslint-disable-next-line react-hooks/refs
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !busy.current && latest.current.count > 1 && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderMove: (_, g) => { if (!busy.current) x.setValue(Math.max(-latest.current.width, Math.min(latest.current.width, g.dx))); },
    onPanResponderRelease: (_, g) => { const dx = g.dx; moveRef.current(dx); },
    onPanResponderTerminate: () => { x.stopAnimation(); busy.current = false; Animated.spring(x, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(); },
    onPanResponderTerminationRequest: () => false,
  }), [x]);
  if (!photos.length) return null;
  return <View style={{ gap: 10 }}>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%', maxWidth: 320, aspectRatio: 3 / 4, paddingRight: photos.length > 1 ? 16 : 0, paddingBottom: photos.length > 1 ? 12 : 0, overflow: 'hidden' }}>
      {[2, 1, 0].filter(offset => activeIndex + offset < photos.length).map(offset => {
        const photo = photos[activeIndex + offset];
        return <Animated.View key={`${photo.id}:${offset}`} {...(offset === 0 ? pan.panHandlers : {})} style={{ position: 'absolute', top: offset * 5, bottom: (photos.length > 1 ? 12 : 0) - offset * 5, left: offset * 7, right: (photos.length > 1 ? 16 : 0) - offset * 7, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: offset ? 1 : 0, borderColor: colors.border, transform: [{ translateX: offset === 0 ? x : 0 }], shadowColor: '#000', shadowOpacity: .12, shadowRadius: 5 }}>
          <Image source={{ uri: photo.downloadURL }} contentFit="cover" cachePolicy="memory-disk" style={{ width: '100%', height: '100%' }} onError={() => setFailed(previous => [...previous, photo.downloadURL])} />
        </Animated.View>;
      })}
    </View>
    {photos.length > 1 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="前のレビュー写真" disabled={activeIndex === 0} onPress={() => move(80)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.text }}>←</Text></Pressable>
      <Text accessibilityLiveRegion="polite" style={{ color: colors.muted }}>{activeIndex + 1} / {photos.length}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="次のレビュー写真" disabled={activeIndex === photos.length - 1} onPress={() => move(-80)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.text }}>→</Text></Pressable>
    </View>}
  </View>;
}
