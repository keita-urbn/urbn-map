import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cropGeometry } from '../lib/iconCrop';
import { useTheme } from '../theme';
// Read the native event only while the responder callback is executing.
function coordinates(event: GestureResponderEvent) {
  const native = event.nativeEvent;
  if (!native || !Number.isFinite(native.pageX) || !Number.isFinite(native.pageY)) return null;
  return { pageX: native.pageX, pageY: native.pageY };
}
export type MapIconDraft = { uri: string };
export default function MapIconEditor({ value, onChange, disabled = false }: { value?: string | null; onChange: (value: MapIconDraft | null) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.min(280, width - 48);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, zoom: 1 });
  const [busy, setBusy] = useState(false);
  const transform = useRef({ x: 0, y: 0, zoom: 1 });
  const drag = useRef<{ pageX: number; pageY: number; x: number; y: number } | null>(null);
  const frame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const cancelFrame = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  const finishDrag = () => {
    drag.current = null;
    cancelFrame();
    setPosition({ ...transform.current });
  };
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    drag.current = null;
  }, []);
  useEffect(() => {
    if (disabled || busy) {
      drag.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, [disabled, busy]);

  const [error, setError] = useState('');
  const g = asset ? cropGeometry(asset.width, asset.height, size, position.zoom, position.x, position.y) : null;
  const pick = async () => {
    try {
      setError('');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) return;
      const a = result.assets[0];
      if (a.type === 'video' || a.mimeType && !/^image\/(jpeg|png|webp|heic|heif)$/.test(a.mimeType)) throw new Error('JPEG / PNG / WebP / HEIC 画像を選んでください。');
      if (!a.width || !a.height || (a.fileSize ?? 0) > 20 * 1024 * 1024) throw new Error('20MB以下の画像を選んでください。');
      const actualSize = Platform.OS === 'web' ? (await (await fetch(a.uri)).blob()).size : await FileSystem.getInfoAsync(a.uri).then(info => info.exists ? info.size : 0);
      if (!actualSize || actualSize > 20 * 1024 * 1024) throw new Error('20MB以下の画像を選んでください。');
      cancelFrame(); drag.current = null;
      transform.current = { x: 0, y: 0, zoom: 1 };
      setPosition({ ...transform.current }); setAsset(a);
    } catch (e) { setError(String((e as Error).message)); }
  };
  const confirm = async () => {
    if (!asset || disabled || busy) return;
    finishDrag();
    const snapshot = { ...transform.current };
    const finalGeometry = cropGeometry(asset.width, asset.height, size, snapshot.zoom, snapshot.x, snapshot.y);
    setBusy(true); setError('');
    try {
      const image = await manipulateAsync(asset.uri, [{ crop: finalGeometry.crop }, { resize: { width: 256, height: 256 } }], { format: SaveFormat.JPEG, compress: .85 });
      onChange({ uri: image.uri }); setAsset(null);
    } catch (e) { setError(`画像の処理に失敗しました: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };
  const startDrag = (event: GestureResponderEvent) => {
    if (!asset || busy || disabled) return;
    const point = coordinates(event);
    if (!point) { finishDrag(); return; }
    cancelFrame();
    const current = transform.current;
    const geometry = cropGeometry(asset.width, asset.height, size, current.zoom, current.x, current.y);
    drag.current = { ...point, x: geometry.x, y: geometry.y };
  };
  const moveDrag = (event: GestureResponderEvent) => {
    if (!asset || busy || disabled || !drag.current) return;
    const point = coordinates(event);
    if (!point) return;
    // All event values are primitives before scheduling any callback.
    const origin = drag.current;
    const current = transform.current;
    const geometry = cropGeometry(asset.width, asset.height, size, current.zoom,
      origin.x + point.pageX - origin.pageX, origin.y + point.pageY - origin.pageY);
    transform.current = { zoom: current.zoom, x: geometry.x, y: geometry.y };
    if (frame.current === null) frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setPosition({ ...transform.current });
    });
  };
  const zoomBy = (amount: number) => {
    if (!asset || busy || disabled) return;
    finishDrag();
    const current = transform.current;
    const zoom = Math.max(1, Math.min(4, current.zoom + amount));
    const ratio = zoom / current.zoom;
    const geometry = cropGeometry(asset.width, asset.height, size, zoom, current.x * ratio, current.y * ratio);
    transform.current = { zoom, x: geometry.x, y: geometry.y };
    setPosition({ ...transform.current });
  };
  const close = () => { if (!busy) { finishDrag(); setAsset(null); } };
  return <View style={{ gap: 10 }}>
    <Text style={{ color: colors.text, fontWeight: '700' }}>マップアイコン（写真・ギャラリーとは別）</Text>
    {value ? <Image source={{ uri: value }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : <Text style={{ color: colors.muted }}>未設定：標準アイコンを使用</Text>}
    <View style={{ flexDirection: 'row', gap: 12 }}><EditorButton label={value ? '変更する' : '画像を選ぶ'} onPress={() => void pick()} disabled={disabled} />{value && <EditorButton label={'削除する'} onPress={() => onChange(null)} disabled={disabled} />}</View>
    {!!error && !asset && <Text accessibilityRole="alert" style={{ color: '#ef4444' }}>{error}</Text>}
    <Modal visible={!!asset} animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <Text style={{ color: colors.text }}>ドラッグで位置調整・＋／−でズーム</Text>
        <View accessibilityLabel="保存される円形アイコンのプレビュー" style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#222', borderWidth: 1, borderColor: '#fff' }}
          onStartShouldSetResponder={() => !!asset && !busy && !disabled}
          onResponderGrant={startDrag}
          onResponderMove={moveDrag}
          onResponderRelease={finishDrag}
          onResponderTerminate={finishDrag}
          onResponderTerminationRequest={() => true}>
          {asset && g && <Image source={{ uri: asset.uri }} resizeMode="stretch" style={{ position: 'absolute', width: asset.width * g.scale, height: asset.height * g.scale, left: (size - asset.width * g.scale) / 2 + g.x, top: (size - asset.height * g.scale) / 2 + g.y }} />}
        </View>
        <View style={{ flexDirection: 'row', gap: 20 }}><EditorButton label={'− 縮小'} onPress={() => zoomBy(-.2)} disabled={busy || disabled} /><EditorButton label={'＋ 拡大'} onPress={() => zoomBy(.2)} disabled={busy || disabled} /></View>
        {!!error && <Text accessibilityRole="alert" style={{ color: '#ef4444', padding: 16 }}>{error}</Text>}
        <View style={{ flexDirection: 'row', gap: 20 }}><EditorButton label={'キャンセル'} onPress={close} disabled={busy} /><EditorButton label={busy ? '処理中...' : 'この範囲で確定'} onPress={() => void confirm()} disabled={busy || disabled} /></View>
      </View>
    </Modal>
  </View>;
}

function EditorButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ padding: 12, minHeight: 44, borderRadius: 12, backgroundColor: colors.surface, opacity: disabled ? .5 : 1 }}><Text style={{ color: colors.text }}>{label}</Text></Pressable>;
}
