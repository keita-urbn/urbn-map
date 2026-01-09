import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { addShop } from "../../hooks/useShops";
import uploadImage from "../../lib/uploadImage";
import type { ShopDoc } from "../../types/shop";

const PH = "#9CA3AF"; // 薄いグレー

// Firestoreはundefinedを保存できないので、undefinedのキーを削除する
function stripUndefined<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

export default function AddShopScreen() {
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [area, setArea] = useState("");
  const [genre, setGenre] = useState("");
  const [address, setAddress] = useState("");
  const [brands, setBrands] = useState("");
  const [instagram, setInstagram] = useState("");
  const [comment, setComment] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      setImageUri(res.assets[0]?.uri ?? null);
    }
  };

  const onSave = async () => {
    if (!canSave) {
      Alert.alert("入力不足", "name / lat / lng を確認して。");
      return;
    }

    setSaving(true);
    try {
      // 画像アップロード（任意）
      let imageUrl: string | undefined = undefined;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      // まずは「undefined込み」で作る（この時点ではOK）
      const rawPayload: Omit<ShopDoc, "id"> = {
        name: name.trim(),
        lat: Number(lat),
        lng: Number(lng),

        area: area.trim() ? area.trim() : undefined,
        genre: genre.trim() ? genre.trim() : undefined,
        address: address.trim() ? address.trim() : undefined,
        brands: brands.trim() ? brands.trim() : undefined,
        instagram: instagram.trim() ? instagram.trim() : undefined,
        comment: comment.trim() ? comment.trim() : undefined,

        imageUrl: imageUrl ? imageUrl : undefined,

        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Firestore投入前にundefinedキーを削除
      const payload = stripUndefined(rawPayload) as Omit<ShopDoc, "id">;

      const id = await addShop(payload);

      Alert.alert("保存完了", "店舗を追加した。");
      router.replace(`/admin/edit-shop/${id}`);
    } catch (e: any) {
      console.error(e);
      Alert.alert("保存失敗", String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>店舗追加</Text>

      <TextInput
        style={styles.input}
        placeholder="name"
        placeholderTextColor={PH}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="lat"
        placeholderTextColor={PH}
        value={lat}
        onChangeText={setLat}
        keyboardType="decimal-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="lng"
        placeholderTextColor={PH}
        value={lng}
        onChangeText={setLng}
        keyboardType="decimal-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="area"
        placeholderTextColor={PH}
        value={area}
        onChangeText={setArea}
      />

      <TextInput
        style={styles.input}
        placeholder="genre"
        placeholderTextColor={PH}
        value={genre}
        onChangeText={setGenre}
      />

      <TextInput
        style={styles.input}
        placeholder="address"
        placeholderTextColor={PH}
        value={address}
        onChangeText={setAddress}
      />

      <TextInput
        style={styles.input}
        placeholder="brands (comma separated)"
        placeholderTextColor={PH}
        value={brands}
        onChangeText={setBrands}
      />

      <TextInput
        style={styles.input}
        placeholder="instagram url"
        placeholderTextColor={PH}
        value={instagram}
        onChangeText={setInstagram}
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="comment"
        placeholderTextColor={PH}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text style={styles.imageBtnText}>画像を選ぶ</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveBtn, !canSave || saving ? styles.saveBtnDisabled : null]}
        onPress={onSave}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveBtnText}>{saving ? "保存中..." : "保存"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 14, paddingBottom: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },

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
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  imageBtnText: { fontSize: 15, fontWeight: "700", color: "#111827" },

  saveBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#6B7280" },
});
