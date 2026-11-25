import { useState } from "react";
import { legalDocuments } from "../content/legal/metadata";
import AgreementCheckbox from "./legal/AgreementCheckbox";
import LegalDocumentScreen from "./legal/LegalDocumentScreen";
import PhotoManager from "./PhotoManager";
import type { DraftPhoto } from "../lib/photoGallery";
import { Ionicons } from '@expo/vector-icons';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import DisplayText from './ui/DisplayText';
type Props = { images: DraftPhoto[]; onImages: (images: DraftPhoto[]) => void; visible: boolean; rating: number; text: string; posting: boolean; error: string; onRating: (rating: number) => void; onText: (text: string) => void; onClose: () => void; onSubmit: () => void; guidelineState: "optional" | "loading" | "required" | "failed"; guidelineChecked: boolean; onGuidelineChange: (checked: boolean) => void; onGuidelineRetry: () => void };
export default function ReviewComposer({ images, onImages, visible, rating, text, posting, error, onRating, onText, onClose, onSubmit, guidelineState, guidelineChecked, onGuidelineChange, onGuidelineRetry }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showGuidelines, setShowGuidelines] = useState(false);
  const cannotPost = posting || !text.trim() || guidelineState === "loading" || guidelineState === "failed"
    || (guidelineState === "required" && !guidelineChecked);
  return <Modal visible={visible} animationType="slide" onRequestClose={() => {
    if (showGuidelines) setShowGuidelines(false);
    else if (!posting) onClose();
  }}>
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView accessibilityElementsHidden={showGuidelines} importantForAccessibility={showGuidelines ? "no-hide-descendants" : "auto"} aria-hidden={showGuidelines} style={{ flex: 1, display: showGuidelines ? "none" : "flex", backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
        <View>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>投稿する前にガイドラインをご確認ください。</Text>
          <Pressable accessibilityRole="link" disabled={posting} onPress={() => { Keyboard.dismiss(); setShowGuidelines(true); }}
            style={{ minHeight: 44, alignSelf: "flex-start", justifyContent: "center" }}>
            <Text style={{ color: colors.text, textDecorationLine: "underline" }}>コミュニティガイドライン</Text>
          </Pressable>
          {guidelineState === "required" && <AgreementCheckbox checked={guidelineChecked} onChange={onGuidelineChange}
            disabled={posting} label="コミュニティガイドラインを確認しました。" />}
          {guidelineState === "loading" && <Text style={{ color: colors.muted }}>確認状況を読み込み中…</Text>}
          {guidelineState === "failed" && <Pressable accessibilityRole="button" onPress={onGuidelineRetry}
            style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ color: colors.text }}>確認状況を取得できませんでした。再読み込み</Text>
          </Pressable>}
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: cannotPost }} disabled={cannotPost} onPress={onSubmit} style={{ backgroundColor: '#ef4444', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, opacity: cannotPost ? .5 : 1 }}><Text style={{ color: '#fff', fontWeight: '700' }}>{posting ? '投稿中…' : '投稿する'}</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
    {showGuidelines && <View accessibilityViewIsModal style={StyleSheet.absoluteFill}>
      <LegalDocumentScreen document={legalDocuments.community} onBack={() => setShowGuidelines(false)} />
    </View>}
    </View>
  </Modal>;
}
