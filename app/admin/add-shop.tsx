// app/admin/add-shop.tsx
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
import { useTheme } from "../../theme";
import type { ShopDoc } from "../../types/shop";

function stripUndefined<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

export default function AddShopScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    if (!res.canceled) setImageUri(res.assets[0]?.uri ?? null);
  };

  const onSave = async () => {
    if (!canSave) {
      Alert.alert("入力不足", "name / lat / lng を確認して。");
      return;
    }

    setSaving(true);
    try {
      let imageUrl: string | undefined = undefined;
      if (imageUri) imageUrl = await uploadImage(imageUri);

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

      const payload = stripUndefined(rawPayload) as Omit<ShopDoc, "id">;
      const id = await addShop(payload);

      Alert.alert("保存完了", "店舗を追加しました。");
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

      <TextInput style={styles.input} placeholder="name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="lat" placeholderTextColor={colors.muted} value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
      <TextInput style={styles.input} placeholder="lng" placeholderTextColor={colors.muted} value={lng} onChangeText={setLng} keyboardType="decimal-pad" />
      <TextInput style={styles.input} placeholder="area" placeholderTextColor={colors.muted} value={area} onChangeText={setArea} />
      <TextInput style={styles.input} placeholder="genre" placeholderTextColor={colors.muted} value={genre} onChangeText={setGenre} />
      <TextInput style={styles.input} placeholder="address" placeholderTextColor={colors.muted} value={address} onChangeText={setAddress} />
      <TextInput style={styles.input} placeholder="brands (comma separated)" placeholderTextColor={colors.muted} value={brands} onChangeText={setBrands} />
      <TextInput style={styles.input} placeholder="instagram url" placeholderTextColor={colors.muted} value={instagram} onChangeText={setInstagram} autoCapitalize="none" />

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="comment"
        placeholderTextColor={colors.muted}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <TouchableOpacity style={styles.outlineBtn} onPress={pickImage}>
        <Text style={styles.outlineBtnText}>画像を選ぶ</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, (!canSave || saving) && styles.disabled]}
        onPress={onSave}
        disabled={!canSave || saving}
      >
        <Text style={styles.primaryBtnText}>{saving ? "保存中..." : "保存"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 14, paddingBottom: 24, gap: 10 },
    title: { fontSize: 18, fontWeight: "800", marginBottom: 6, color: colors.text },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    multiline: { minHeight: 90, textAlignVertical: "top" },

    outlineBtn: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    outlineBtnText: { fontSize: 15, fontWeight: "700", color: colors.text },

    primaryBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.text, // ← テーマに連動（黒/白反転）
    },
    primaryBtnText: { fontSize: 15, fontWeight: "900", color: colors.background },

    disabled: { opacity: 0.5 },
  });
}
