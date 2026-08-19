import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { getShopById, removeShop, updateShop } from "../../../hooks/useShops";
import uploadImage from "../../../lib/uploadImage";
import { useTheme } from "../../../theme";
import type { ShopDoc } from "../../../types/shop";

export default function EditShopScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { id } = useLocalSearchParams<{ id: string }>();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [genre, setGenre] = useState("");
  const [address, setAddress] = useState("");
  const [brands, setBrands] = useState("");
  const [instagram, setInstagram] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [comment, setComment] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [pickedUri, setPickedUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;

        const s = await getShopById(String(id));
        if (!s) {
          if (Platform.OS === "web") {
            window.alert("該当する店舗がありません。");
          } else {
            Alert.alert("見つからない", "該当する店舗がありません。");
          }
          router.back();
          return;
        }

        setName(s.name ?? "");
        setArea(s.area ?? "");
        setGenre(s.genre ?? "");
        setAddress(s.address ?? "");
        setBrands(s.brands ?? "");
        setInstagram(s.instagram ?? "");
        setImageUrl(s.imageUrl ?? "");
        setComment(s.comment ?? "");
        setLat(String(s.lat ?? ""));
        setLng(String(s.lng ?? ""));
        setLoaded(true);
      } catch (e: any) {
        console.error(e);
        const msg = String(e?.message ?? e);
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("読み込み失敗", msg);
      }
    })();
  }, [id]);

  const canSave = useMemo(() => {
    const n = name.trim().length > 0;
    const la = Number(lat);
    const ln = Number(lng);
    return n && Number.isFinite(la) && Number.isFinite(ln);
  }, [name, lat, lng]);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled) {
      setPickedUri(res.assets[0].uri);
    }
  };

  const onSave = async () => {
    if (!id) return;
    if (!canSave) {
      const msg = "店名 / 緯度 / 経度 を確認して。";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("入力不足", msg);
      return;
    }

    setSaving(true);
    try {
      let nextImageUrl = imageUrl.trim() || undefined;
      if (pickedUri) {
        nextImageUrl = await uploadImage(pickedUri, `shops/${String(id)}/cover`);
      }

      const patch: Partial<Omit<ShopDoc, "id">> = {
        name: name.trim(),
        lat: Number(lat),
        lng: Number(lng),
      };

      if (area.trim()) patch.area = area.trim();
      if (genre.trim()) patch.genre = genre.trim();
      if (address.trim()) patch.address = address.trim();
      if (brands.trim()) patch.brands = brands.trim();
      if (instagram.trim()) patch.instagram = instagram.trim();
      if (comment.trim()) patch.comment = comment.trim();
      if (nextImageUrl) patch.imageUrl = nextImageUrl;

      await updateShop(String(id), patch);

      if (Platform.OS === "web") window.alert("更新した。");
      else Alert.alert("保存完了", "更新した。");

      router.back();
    } catch (e: any) {
      console.error(e);
      const msg = String(e?.message ?? e);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("保存失敗", msg);
    } finally {
      setSaving(false);
    }
  };

  const reallyDelete = async () => {
    if (!id) return;
    try {
      await removeShop(String(id));

      if (Platform.OS === "web") window.alert("削除した。");
      else Alert.alert("削除完了", "削除した。");

      // 戻り先は list に統一（tabs配下ならこれでOK）
      router.replace("/(tabs)/list");
    } catch (e: any) {
      console.error(e);
      const msg = String(e?.message ?? e);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("削除失敗", msg);
    }
  };

  const onDelete = () => {
    if (!id) return;

    // ✅ Webは window.confirm を使う（これが効く）
    if (Platform.OS === "web") {
      const ok = window.confirm("本当に削除する？");
      if (!ok) return;
      void reallyDelete();
      return;
    }

    // ✅ アプリは従来通り Alert
    Alert.alert("削除確認", "本当に削除する？", [
      { text: "キャンセル", style: "cancel" },
      { text: "削除する", style: "destructive", onPress: () => void reallyDelete() },
    ]);
  };

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.muted }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>店舗編集</Text>

      <Text style={styles.label}>店名 *</Text>
      <TextInput
        style={styles.input}
        placeholder="例：jack pot"
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>エリア</Text>
      <TextInput
        style={styles.input}
        placeholder="例：新宿"
        placeholderTextColor={colors.muted}
        value={area}
        onChangeText={setArea}
      />

      <Text style={styles.label}>ジャンル</Text>
      <TextInput
        style={styles.input}
        placeholder="例：セレクト"
        placeholderTextColor={colors.muted}
        value={genre}
        onChangeText={setGenre}
      />

      <Text style={styles.label}>住所</Text>
      <TextInput
        style={styles.input}
        placeholder="例：東京都〇〇..."
        placeholderTextColor={colors.muted}
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.label}>ブランド</Text>
      <TextInput
        style={styles.input}
        placeholder="例：CELINE, YSL"
        placeholderTextColor={colors.muted}
        value={brands}
        onChangeText={setBrands}
      />

      <Text style={styles.label}>Instagram / URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        placeholderTextColor={colors.muted}
        value={instagram}
        onChangeText={setInstagram}
        autoCapitalize="none"
      />

      <Text style={styles.label}>画像</Text>
      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text style={styles.imageBtnText}>画像を選ぶ</Text>
      </TouchableOpacity>

      {pickedUri || imageUrl.trim() ? (
        <Image source={{ uri: pickedUri || imageUrl }} style={styles.imagePreview} />
      ) : null}

      <Text style={styles.label}>画像URL（手動も可）</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        placeholderTextColor={colors.muted}
        value={imageUrl}
        onChangeText={setImageUrl}
        autoCapitalize="none"
      />

      <Text style={styles.label}>概要</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="例：デザイナーズ強い"
        placeholderTextColor={colors.muted}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <Text style={styles.label}>緯度 (Latitude) *</Text>
      <TextInput
        style={styles.input}
        placeholder="35.693"
        placeholderTextColor={colors.muted}
        value={lat}
        onChangeText={setLat}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>経度 (Longitude) *</Text>
      <TextInput
        style={styles.input}
        placeholder="139.703"
        placeholderTextColor={colors.muted}
        value={lng}
        onChangeText={setLng}
        keyboardType="decimal-pad"
      />

      <TouchableOpacity
        style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
        onPress={onSave}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveBtnText}>{saving ? "保存中..." : "保存する"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteBtnText}>削除する</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 14, paddingBottom: 28, gap: 10 },

    title: { fontSize: 18, fontWeight: "800", marginBottom: 6, color: colors.text },
    label: { fontSize: 14, fontWeight: "800", marginTop: 6, color: colors.text },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    multiline: { minHeight: 90, textAlignVertical: "top" },

    imageBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    imageBtnText: { fontSize: 15, fontWeight: "700", color: colors.text },
    imagePreview: { width: "100%", aspectRatio: 16 / 9, borderRadius: 10 },

    saveBtn: {
      marginTop: 10,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.text,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: colors.background, fontWeight: "900", fontSize: 15 },

    deleteBtn: {
      borderWidth: 2,
      borderColor: "#EF4444",
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.surface,
      marginTop: 8,
    },
    deleteBtnText: { color: "#EF4444", fontWeight: "900", fontSize: 15 },

    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  });
}