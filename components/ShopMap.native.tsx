// components/ShopMap.native.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import type { ShopDoc } from "../types/shop";

type Props = {
  shops: ShopDoc[];
  initialRegion: Region;

  selected: ShopDoc | null;
  onSelect: (shop: ShopDoc | null) => void;

  onOpenDetail: (shop: ShopDoc) => void;
  onOpenDirections: (shop: ShopDoc) => void;
};

const CARD_W = 260;
const CARD_H_EST = 150; // 高さはざっくり（カードが崩れない範囲でOK）

export default function ShopMapNative({
  shops,
  initialRegion,
  selected,
  onSelect,
  onOpenDetail,
  onOpenDirections,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const ignoreNextMapPress = useRef(false);

  const [cardPoint, setCardPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  const markers = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = Number(s?.lat);
        const lng = Number(s?.lng);
        const id = String(s?.id ?? s?.docId ?? "");
        if (!id) return null;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { shop: s as ShopDoc, lat, lng, id };
      })
      .filter(Boolean) as Array<{ shop: ShopDoc; lat: number; lng: number; id: string }>;
  }, [shops]);

  const updateCardPoint = useCallback(async (shop: ShopDoc | null) => {
    if (!shop) {
      setCardPoint(null);
      return;
    }
    const lat = Number((shop as any)?.lat);
    const lng = Number((shop as any)?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setCardPoint(null);
      return;
    }
    try {
      const p = await mapRef.current?.pointForCoordinate({
        latitude: lat,
        longitude: lng,
      });
      if (!p) return;
      setCardPoint({ x: p.x, y: p.y });
    } catch {
      // 変換に失敗したらカード出さない（中途半端に出すと崩れる）
      setCardPoint(null);
    }
  }, []);

  // 選択が変わったらカード位置を更新
  useEffect(() => {
    updateCardPoint(selected);
  }, [selected, updateCardPoint]);

  const onMapPress = useCallback(() => {
    if (ignoreNextMapPress.current) {
      ignoreNextMapPress.current = false;
      return;
    }
    onSelect(null);
  }, [onSelect]);

  const onMarkerPress = useCallback(
    (shop: ShopDoc) => {
      ignoreNextMapPress.current = true;
      onSelect(shop);
      // 少し遅延させると pointForCoordinate が安定するケースがある
      setTimeout(() => updateCardPoint(shop), 0);
    },
    [onSelect, updateCardPoint]
  );

  const cardStyle = useMemo(() => {
    if (!selected || !cardPoint) return null;

    const { width, height } = Dimensions.get("window");

    // カードは「ピンの上」に置く（1枚目の動き）
    let left = cardPoint.x - CARD_W / 2;
    let top = cardPoint.y - CARD_H_EST - 18;

    // 画面外に出ないようクランプ
    left = Math.max(10, Math.min(left, width - CARD_W - 10));
    top = Math.max(80, Math.min(top, height - CARD_H_EST - 140)); // 下タブや余白を考慮

    return { left, top };
  }, [selected, cardPoint]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onPress={onMapPress}
        onRegionChangeComplete={() => updateCardPoint(selected)}
      >
        {markers.map(({ shop, lat, lng, id }) => (
          <Marker
            key={id}
            coordinate={{ latitude: lat, longitude: lng }}
            onPress={() => onMarkerPress(shop)}
          />
        ))}
      </MapView>

      {/* 1枚目：ピン上に浮くカード */}
      {selected && cardStyle ? (
        <View style={[styles.cardWrap, cardStyle]}>
          <View style={styles.card}>
            <Text style={styles.title}>{(selected as any)?.name ?? ""}</Text>

            <Pressable onPress={() => onOpenDetail(selected)} hitSlop={8}>
              <Text style={styles.detailLink}>詳細を見る</Text>
            </Pressable>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onOpenDirections(selected)}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>経路案内</Text>
            </TouchableOpacity>

            <Pressable onPress={() => onSelect(null)} hitSlop={8} style={styles.close}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  cardWrap: {
    position: "absolute",
    width: CARD_W,
    zIndex: 50,
  },

  card: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 14,
  },

  title: { fontSize: 18, fontWeight: "900", marginBottom: 6 },

  detailLink: {
    color: "#1d4ed8",
    fontWeight: "900",
    marginBottom: 12,
  },

  navBtn: {
    backgroundColor: "black",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  navBtnText: { color: "white", fontWeight: "900" },

  close: { alignSelf: "flex-end", marginTop: 10 },
  closeText: { color: "#6b7280", fontWeight: "800" },
});
