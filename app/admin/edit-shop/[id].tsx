import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { getShopById, removeShop, updateShop } from "../../../hooks/useShops";
import uploadImage from "../../../lib/uploadImage";
import type { ShopDoc } from "../../../types/shop";

const PH = "#9CA3AF"; // ←薄いグレー

export default function EditShopScreen() {
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
          Alert.alert("見つからない", "該当する店舗がありません。");
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
        Alert.alert("読み込み失敗", String(e?.message ?? e));
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
      Alert.alert("入力不足", "店名 / 緯度 / 経度 を確認して。");
      return;
    }

    setSaving(true);
    try {
      let nextImageUrl = imageUrl.trim() || undefined;
      if (pickedUri) {
        nextImageUrl = await uploadImage(pickedUri);
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
      Alert.alert("保存完了", "更新した。");
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert("保存失敗", String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    Alert.alert("削除確認", "本当に削除する？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除する",
        style: "destructive",
        onPress: async () => {
          try {
            await removeShop(String(id));
            Alert.alert("削除完了", "削除した。");
            router.replace("/(tabs)/list");
          } catch (e: any) {
            console.error(e);
            Alert.alert("削除失敗", String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: "#6B7280" }}>Loading...</Text>
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
        placeholderTextColor={PH}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>エリア</Text>
      <TextInput
        style={styles.input}
        placeholder="例：新宿"
        placeholderTextColor={PH}
        value={area}
        onChangeText={setArea}
      />

      <Text style={styles.label}>ジャンル</Text>
      <TextInput
        style={styles.input}
        placeholder="例：セレクト"
        placeholderTextColor={PH}
        value={genre}
        onChangeText={setGenre}
      />

      <Text style={styles.label}>住所</Text>
      <TextInput
        style={styles.input}
        placeholder="例：東京都〇〇..."
        placeholderTextColor={PH}
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.label}>ブランド</Text>
      <TextInput
        style={styles.input}
        placeholder="例：CELINE, YSL"
        placeholderTextColor={PH}
        value={brands}
        onChangeText={setBrands}
      />

      <Text style={styles.label}>Instagram / URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        placeholderTextColor={PH}
        value={instagram}
        onChangeText={setInstagram}
        autoCapitalize="none"
      />

      <Text style={styles.label}>画像</Text>
      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text style={styles.imageBtnText}>画像を選ぶ</Text>
      </TouchableOpacity>

      <Text style={styles.label}>画像URL（手動も可）</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        placeholderTextColor={PH}
        value={imageUrl}
        onChangeText={setImageUrl}
        autoCapitalize="none"
      />

      <Text style={styles.label}>一言コメント</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="例：デザイナーズ強い"
        placeholderTextColor={PH}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <Text style={styles.label}>緯度 (Latitude) *</Text>
      <TextInput
        style={styles.input}
        placeholder="35.693"
        placeholderTextColor={PH}
        value={lat}
        onChangeText={setLat}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>経度 (Longitude) *</Text>
      <TextInput
        style={styles.input}
        placeholder="139.703"
        placeholderTextColor={PH}
        value={lng}
        onChangeText={setLng}
        keyboardType="decimal-pad"
      />

      <TouchableOpacity
        style={[styles.saveBtn, !canSave || saving ? styles.saveBtnDisabled : null]}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 14, paddingBottom: 28, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },

  label: { fontSize: 14, fontWeight: "800", marginTop: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },

  imageBtn: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  imageBtnText: { fontSize: 15, fontWeight: "700", color: "#111827" },

  saveBtn: {
    marginTop: 10,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "white", fontWeight: "900", fontSize: 15 },

  deleteBtn: {
    borderWidth: 2,
    borderColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
    marginTop: 8,
  },
  deleteBtnText: { color: "#EF4444", fontWeight: "900", fontSize: 15 },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
