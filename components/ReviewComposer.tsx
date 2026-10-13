import PhotoManager from "./PhotoManager";
import type { DraftPhoto } from "../lib/photoGallery";
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import DisplayText from './ui/DisplayText';
type Props = { images: DraftPhoto[]; onImages: (images: DraftPhoto[]) => void; visible: boolean; rating: number; text: string; posting: boolean; error: string; onRating: (rating: number) => void; onText: (text: string) => void; onClose: () => void; onSubmit: () => void };
export default function ReviewComposer({ images, onImages, visible, rating, text, posting, error, onRating, onText, onClose, onSubmit }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!posting) onClose(); }}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 24, flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <DisplayText style={{ color: colors.text, fontSize: 28, flex: 1 }}>YOUR TAKE</DisplayText>
          <Pressable accessibilityRole="button" accessibilityLabel="レビュー入力を閉じる" disabled={posting} onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" color={colors.text} size={24} /></Pressable>
        </View>
        <Text style={{ color: colors.muted, fontSize: 15 }}>このショップについてどう思う？</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>{[1, 2, 3, 4, 5].map(n => <Pressable key={n} disabled={posting} accessibilityRole="button" accessibilityLabel={`${n}つ星`} accessibilityState={{ selected: rating === n }} onPress={() => onRating(n)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={rating >= n ? 'star' : 'star-outline'} color={rating >= n ? colors.text : colors.muted} size={25} /></Pressable>)}<Text style={{ color: colors.muted }}>{rating}/5</Text></View>
        <TextInput accessibilityLabel="レビュー本文" editable={!posting} multiline value={text} onChangeText={onText} placeholder="あなたの体験や発見を教えてください" placeholderTextColor={colors.muted} style={{ minHeight: 160, borderRadius: 16, padding: 16, fontSize: 16, lineHeight: 25, textAlignVertical: 'top', color: colors.text, backgroundColor: colors.surface }} />
        <PhotoManager images={images} onChange={onImages} disabled={posting} maximum={5} reorderable={false} />
        {!!error && <Text accessibilityRole="alert" style={{ color: '#ef4444', lineHeight: 22 }}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={posting || !text.trim()} onPress={onSubmit} style={{ backgroundColor: '#ef4444', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, opacity: posting || !text.trim() ? .5 : 1 }}><Text style={{ color: '#fff', fontWeight: '700' }}>{posting ? '投稿中…' : '投稿する'}</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
