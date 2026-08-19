// app/admin/add-shop.tsx
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { addShop } from "../../hooks/useShops";
import { useTheme } from "../../theme";
import type { ShopDoc } from "../../types/shop";

function stripUndefined<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

// ✅ Webでも落ちない数値正規化（カンマ/全角/空白対応）
function normalizeNumberInput(s: string) {
  return (s ?? "")
    .trim()
    .replace(/，/g, ",")
    .replace(/．/g, ".")
    .replace(/,/g, ".")
    .replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10));
}
function toNum(s: string) {
  const t = normalizeNumberInput(s);
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

type Status =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function AddShopScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const navTimerRef = useRef<any>(null);
  const toastTimerRef = useRef<any>(null);

  // ✅ 成功トースト用アニメ
  const toastY = useRef(new Animated.Value(-20)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastText, setToastText] = useState<string>("");

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const canSave = useMemo(() => {
    const n = name.trim().length > 0;
    const la = toNum(lat);
    const ln = toNum(lng);
    return n && Number.isFinite(la) && Number.isFinite(ln);
  }, [name, lat, lng]);

  const saving = status.type === "saving";

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled) setImageUri(res.assets[0]?.uri ?? null);
  };

  const goList = () => router.replace("/(tabs)/list");

  const resetForm = () => {
    setName("");
    setLat("");
    setLng("");
    setArea("");
    setGenre("");
    setAddress("");
    setBrands("");
    setInstagram("");
    setComment("");
    setImageUri(null);
  };

  // ✅ 成功トーストを出す（Webでも確実）
  const showToast = (text: string) => {
    setToastText(text);

    // 既存タイマーを殺す
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    // 初期化
    toastY.setValue(-18);
    toastOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(toastY, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();

    // 1.2秒でフェードアウト
    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(toastY, {
          toValue: -10,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200);
  };

  const onSave = async () => {
    if (saving) return;

    if (!canSave) {
      setStatus({ type: "error", message: "name / lat / lng を確認して。" });
      return;
    }

    setStatus({ type: "saving" });

    try {
      const rawPayload: Omit<ShopDoc, "id"> = {
        name: name.trim(),
        lat: toNum(lat),
        lng: toNum(lng),
        area: area.trim() ? area.trim() : undefined,
        genre: genre.trim() ? genre.trim() : undefined,
        address: address.trim() ? address.trim() : undefined,
        brands: brands.trim() ? brands.trim() : undefined,
        instagram: instagram.trim() ? instagram.trim() : undefined,
        comment: comment.trim() ? comment.trim() : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const payload = stripUndefined(rawPayload) as Omit<ShopDoc, "id">;

      await addShop(payload, imageUri);

      // ✅ ここが「保存完了の通知」
      showToast("✅ 保存完了：店舗を追加しました");

      setStatus({ type: "success", message: "店舗追加完了。1秒後に一覧へ戻る。" });

      resetForm();

      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        goList();
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setStatus({ type: "error", message: String(e?.message ?? e) });
    }
  };

  return (
    <View style={styles.page}>
      {/* ✅ 成功トースト（固定） */}
      {!!toastText && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastY }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastText}</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.title}>店舗追加</Text>

        {/* ステータス表示 */}
        {status.type !== "idle" && (
          <View
            style={[
              styles.statusBox,
              status.type === "success"
                ? styles.statusOk
                : status.type === "error"
                ? styles.statusNg
                : styles.statusMid,
            ]}
          >
            <Text style={styles.statusText}>
              {status.type === "saving"
                ? "保存中..."
                : status.type === "success"
                ? status.message
                : status.message}
            </Text>

            {status.type === "success" && (
              <TouchableOpacity style={styles.backBtn} onPress={goList}>
                <Text style={styles.backBtnText}>今すぐ一覧へ戻る</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="lat"
          placeholderTextColor={colors.muted}
          value={lat}
          onChangeText={(v) => setLat(normalizeNumberInput(v))}
          inputMode="decimal"
        />

        <TextInput
          style={styles.input}
          placeholder="lng"
          placeholderTextColor={colors.muted}
          value={lng}
          onChangeText={(v) => setLng(normalizeNumberInput(v))}
          inputMode="decimal"
        />

        <TextInput
          style={styles.input}
          placeholder="area"
          placeholderTextColor={colors.muted}
          value={area}
          onChangeText={setArea}
        />
        <TextInput
          style={styles.input}
          placeholder="genre"
          placeholderTextColor={colors.muted}
          value={genre}
          onChangeText={setGenre}
        />
        <TextInput
          style={styles.input}
          placeholder="address"
          placeholderTextColor={colors.muted}
          value={address}
          onChangeText={setAddress}
        />
        <TextInput
          style={styles.input}
          placeholder="brands (comma separated)"
          placeholderTextColor={colors.muted}
          value={brands}
          onChangeText={setBrands}
        />
        <TextInput
          style={styles.input}
          placeholder="instagram url"
          placeholderTextColor={colors.muted}
          value={instagram}
          onChangeText={setInstagram}
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="comment"
          placeholderTextColor={colors.muted}
          value={comment}
          onChangeText={setComment}
          multiline
        />

        <TouchableOpacity style={styles.outlineBtn} onPress={pickImage} disabled={saving}>
          <Text style={styles.outlineBtnText}>画像を選ぶ</Text>
        </TouchableOpacity>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.imagePreview} /> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSave || saving) && styles.disabled]}
          onPress={onSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.primaryBtnText}>{saving ? "保存中..." : "保存"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  const toastBg = "#16a34a"; // green
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background },

    toast: {
      position: "absolute",
      top: 10,
      left: 10,
      right: 10,
      zIndex: 9999,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: toastBg,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)",
    },
    toastText: {
      color: "#fff",
      fontWeight: "900",
      fontSize: 14,
      textAlign: "center",
    },

    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 14, paddingBottom: 24, gap: 10, paddingTop: 58 },

    title: { fontSize: 18, fontWeight: "800", marginBottom: 6, color: colors.text },

    statusBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.surface,
      gap: 10,
    },
    statusOk: { opacity: 1 },
    statusNg: { opacity: 1 },
    statusMid: { opacity: 1 },
    statusText: { fontWeight: "800", color: colors.text },

    backBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    backBtnText: { fontWeight: "900", color: colors.text },

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
    imagePreview: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12 },

    primaryBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.text,
    },
    primaryBtnText: { fontSize: 15, fontWeight: "900", color: colors.background },

    disabled: { opacity: 0.5 },
  });
}