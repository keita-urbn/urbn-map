import MetallicBackground from "../../components/MetallicBackground";
import ArticleContent from "../../components/ArticleContent";
import ArticleBlockEditor, { ArticleImageManager, removeImageReferences } from "../../components/ArticleBlockEditor";
import { contentId, type ArticleBlock, type ArticleImage } from "../../lib/articleContent";
import { loadPrivateArticle, saveArticle, type DraftArticleImage } from "../../lib/articlePersistence";
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/auth';
import { parseHashtags } from '../../hooks/useAnnouncements';
import { db } from '../../lib/firebase';
import { ARTICLE_SOURCES, INFO_CATEGORIES, mapInfoArticle, type InfoCategory } from '../../lib/infoArticles';
import { useTheme } from '../../theme';
export default function PublishArticle() {
  const { source, id } = useLocalSearchParams<{ source?: string; id?: string }>();
  const { isAdmin, loading } = useAuth();
  const { colors } = useTheme();
  const [category, setCategory] = useState<InfoCategory>('shop');
  const [title, setTitle] = useState(''); const [tags, setTags] = useState('');
  const [abstract, setAbstract] = useState('');
  const [saving, setSaving] = useState(false); const [status, setStatus] = useState('');
  const [images, setImages] = useState<DraftArticleImage[]>([]);
  const [previousImages, setPreviousImages] = useState<ArticleImage[]>([]);
  const [publicBlocks, setPublicBlocks] = useState<ArticleBlock[]>([]);
  const [bodyBlocks, setBodyBlocks] = useState<ArticleBlock[]>([]);
  const [preview, setPreview] = useState(false);
  const [ready, setReady] = useState(!id);
  useEffect(() => {
    if (!id || !source || !isAdmin || !ARTICLE_SOURCES.includes(source)) return;
    let active = true;
    getDoc(doc(db, source, id)).then(async snap => {
      if (!active) return;
      if (!snap.exists()) { setStatus('記事が見つかりません'); return; }
      const a = mapInfoArticle(id, source, snap.data());
      const privateContent = a.contentVersion === 2 ? await loadPrivateArticle(source, id) : null;
      if (!active) return;
      const legacyBody = privateContent?.body ?? a.body;
      setImages([...a.publicImages, ...(privateContent?.premiumImages ?? [])]); setPreviousImages([...a.publicImages, ...(privateContent?.premiumImages ?? [])]);
      setPublicBlocks(a.publicBlocks);
      setBodyBlocks(privateContent?.bodyBlocks.length ? privateContent.bodyBlocks : legacyBody ? [{ id: contentId(), type: 'text', text: legacyBody }] : []);
      setCategory(a.kind); setTitle(a.title); setTags(a.hashtags.join(', ')); setAbstract(a.abstract); setReady(true);
    }).catch(() => { if (active) setStatus('記事を読み込めませんでした'); });
    return () => { active = false; };
  }, [id, source, isAdmin]);
  const save = async () => {
    if (!isAdmin || saving || !ready || !title.trim()) return;
    setSaving(true); setStatus('');
    try {
      const result = await saveArticle({ source: source && id ? source : INFO_CATEGORIES.find(c => c.key === category)!.collection, id, kind: category, title, hashtags: parseHashtags(tags), abstract, body: bodyBlocks.filter(b => b.type === 'text').map(b => b.text).join('\n\n'), images, previousImages, publicBlocks, bodyBlocks });
      setStatus(result.cleanupFailed ? '保存しました。古い画像の削除に再試行が必要です' : '保存しました');
      setImages(result.images); setPreviousImages(result.images);
      if (!id) { setTitle(''); setTags(''); setAbstract(''); setImages([]); setPreviousImages([]); setPublicBlocks([]); setBodyBlocks([]); }
    } catch (error) { setStatus(error instanceof Error ? error.message : '保存に失敗しました。もう一度お試しください。'); }
    finally { setSaving(false); }
  };
  if (loading) return <Text style={{ color: colors.text }}>読み込み中…</Text>;
  if (!isAdmin) return <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
      <MetallicBackground /><Text style={{ color: colors.text }}>管理者権限が必要です</Text></View>;
  const inputStyle = { backgroundColor: colors.surface, color: colors.text, padding: 14, borderRadius: 14, minHeight: 48, fontSize: 15 };
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <MetallicBackground />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48 }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{id ? '記事を編集' : '記事を投稿'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{INFO_CATEGORIES.map(c => <Pressable key={c.key} disabled={!!id || saving} accessibilityRole="button" accessibilityState={{ selected: category === c.key, disabled: !!id || saving }} onPress={() => setCategory(c.key)} style={{ padding: 12, minHeight: 44, borderRadius: 18, backgroundColor: category === c.key ? '#ef444424' : colors.surface }}><Text style={{ color: category === c.key ? '#ef4444' : colors.text }}>{c.label}</Text></Pressable>)}</View>
      {!!id && <Text style={{ color: colors.muted }}>元のカテゴリーと記事IDを維持して編集します。</Text>}
      <Text style={{ color: colors.text }}>Title *</Text><TextInput accessibilityLabel="Title" editable={!saving && ready} value={title} onChangeText={setTitle} style={inputStyle} />
      <Text style={{ color: colors.text }}>Tags</Text><TextInput accessibilityLabel="Tags" editable={!saving && ready} value={tags} onChangeText={setTags} placeholder="#tokyo, #selectshop" placeholderTextColor={colors.muted} style={inputStyle} />
      <Text style={{ color: colors.text }}>Abstract（全ユーザーに公開）</Text><TextInput accessibilityLabel="Abstract" editable={!saving && ready} multiline value={abstract} onChangeText={setAbstract} style={[inputStyle, { minHeight: 100, textAlignVertical: 'top' }]} />
      <ArticleImageManager access="public" images={images} onChange={setImages} onRemove={imageId => { setImages(images.filter(i => i.id !== imageId)); setPublicBlocks(removeImageReferences(publicBlocks, imageId)); setBodyBlocks(removeImageReferences(bodyBlocks, imageId)); }} disabled={saving || !ready} onError={setStatus} />
      <ArticleImageManager access="premium" images={images} onChange={setImages} onRemove={imageId => { setImages(images.filter(i => i.id !== imageId)); setBodyBlocks(removeImageReferences(bodyBlocks, imageId)); }} disabled={saving || !ready} onError={setStatus} />
      <ArticleBlockEditor label="Public Content（公開）" blocks={publicBlocks} images={images.filter(i => i.access === 'public')} onChange={setPublicBlocks} disabled={saving || !ready} />
      <ArticleBlockEditor label="Body（Premium限定）" blocks={bodyBlocks} images={images} onChange={setBodyBlocks} disabled={saving || !ready} />
      <Pressable accessibilityRole="button" onPress={() => setPreview(!preview)} style={{ padding: 14 }}><Text style={{ color: colors.text }}>プレビュー {preview ? '閉じる' : '開く'}</Text></Pressable>
      {preview && <View style={{ gap: 16 }}><Text style={{ color: colors.text }}>{title}</Text><Text style={{ color: colors.text }}>{abstract}</Text><ArticleContent blocks={[...publicBlocks, ...images.filter(i => i.access === "public" && !publicBlocks.some(b => b.type === "image" && b.imageId === i.id) && !bodyBlocks.some(b => b.type === "image" && b.imageId === i.id)).map(i => ({ id: `gallery-${i.id}`, type: "image" as const, imageId: i.id, access: i.access }))]} images={images.filter(i => i.access === 'public')} localPreviews={Object.fromEntries(images.filter(i => i.uri).map(i => [i.id, i.uri!]))} /><Text style={{ color: colors.muted }}>Premium Body</Text><ArticleContent blocks={[...bodyBlocks, ...images.filter(i => i.access === "premium" && !bodyBlocks.some(b => b.type === "image" && b.imageId === i.id)).map(i => ({ id: `gallery-${i.id}`, type: "image" as const, imageId: i.id, access: i.access }))]} images={images} localPreviews={Object.fromEntries(images.filter(i => i.uri).map(i => [i.id, i.uri!]))} /></View>}
      {!!status && <Text accessibilityRole="alert" style={{ color: colors.text }}>{status}</Text>}
      <Pressable accessibilityRole="button" disabled={saving || !ready || !title.trim()} onPress={() => void save()} style={{ padding: 16, minHeight: 48, backgroundColor: '#ef4444', borderRadius: 14, opacity: saving || !ready || !title.trim() ? .5 : 1 }}><Text style={{ color: '#fff', textAlign: 'center' }}>{saving ? '保存中…' : id ? '更新する' : '投稿する'}</Text></Pressable>
      {!id && <Pressable accessibilityRole="button" disabled={saving} onPress={() => { setTitle(''); setTags(''); setAbstract(''); setImages([]); setPreviousImages([]); setPublicBlocks([]); setBodyBlocks([]); setStatus(''); }} style={{ padding: 14 }}><Text style={{ color: colors.text }}>リセット</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ padding: 14 }}><Text style={{ color: colors.text }}>戻る</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}
