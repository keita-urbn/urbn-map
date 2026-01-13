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
// ✅ 吹き出しの「先端」がある想定の余白（ピンのてっぺんに合わせる分）
const TIP_GAP = 40;
// ✅ 画面端クランプ用の最低高さ（ヘッダーとか）
const TOP_MIN = 80;

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

  // ✅ カードの実高（metaの有無で変わるので測る）
  const [cardH, setCardH] = useState<number>(160);

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
      setCardPoint(null);
    }
  }, []);

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
      setTimeout(() => updateCardPoint(shop), 0);
    },
    [onSelect, updateCardPoint]
  );

  // ✅ ピンの先端(cardPoint)に、カードの「底」が来るように top を決める
  const cardStyle = useMemo(() => {
    if (!selected || !cardPoint) return null;

    const { width, height } = Dimensions.get("window");

    // x は中央揃え
    let left = cardPoint.x - CARD_W / 2;

    // ✅ カードの底 + TIP_GAP が pin(=cardPoint.y) に一致する
    // pinY = top + cardH + TIP_GAP  -> top = pinY - cardH - TIP_GAP
    let top = cardPoint.y - cardH - TIP_GAP;

    // 画面外に出ないようクランプ
    left = Math.max(10, Math.min(left, width - CARD_W - 10));
    top = Math.max(TOP_MIN, Math.min(top, height - cardH - 140));

    return { left, top };
  }, [selected, cardPoint, cardH]);

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

      {/* ピン上に浮くカード（店名＋エリア・ジャンル） */}
      {selected && cardStyle ? (
        <View style={[styles.cardWrap, cardStyle]}>
          <View
            style={styles.card}
            onLayout={(e) => {
              const h = Math.ceil(e.nativeEvent.layout.height);
              // 無駄な再レンダーを避ける（数pxの揺れ対策）
              if (Math.abs(h - cardH) >= 2) setCardH(h);
            }}
          >
            {(() => {
              const name = ((selected as any)?.name ?? "").toString();
              const area = ((selected as any)?.area ?? "").toString().trim();
              const genre = ((selected as any)?.genre ?? "").toString().trim();
              const meta = [area, genre].filter(Boolean).join(" ・ ");

              return (
                <>
                  <Text style={styles.title}>{name}</Text>
                  {!!meta && <Text style={styles.meta}>{meta}</Text>}
                </>
              );
            })()}

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

            <Pressable
              onPress={() => onSelect(null)}
              hitSlop={8}
              style={styles.close}
            >
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>

          {/* ✅ 見た目の「先端」をつけたいなら（任意）
              いらなければこの View は消してOK */}
          <View style={styles.tip} />
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
    alignItems: "center",
  },

  card: {
    width: CARD_W,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 14,
  },

  // ✅ 先端（三角形）
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: TIP_GAP,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(255,255,255,0.95)",
    marginTop: -1, // 枠線と馴染ませる
  },

  title: { fontSize: 18, fontWeight: "900", marginBottom: 4 },

  meta: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
    marginBottom: 10,
  },

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