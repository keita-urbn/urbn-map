// components/ShopMap.tsx
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";
import type { ShopDoc } from "../types/shop";

type Props = {
  shops: ShopDoc[];
  initialRegion: Region;
  onOpenDetail?: (shop: ShopDoc) => void;
  onOpenDirections?: (shop: ShopDoc) => void;
};

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getShopId(s: any): string {
  return String(s?.id ?? s?.docId ?? s?._id ?? s?.shopId ?? s?.uid ?? "");
}

export default function ShopMap({
  shops,
  initialRegion,
  onOpenDetail,
  onOpenDirections,
}: Props) {
  const points = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = toNum(s.lat);
        const lng = toNum(s.lng);
        if (lat == null || lng == null) return null;
        return { id: getShopId(s), lat, lng, shop: s as ShopDoc };
      })
      .filter(Boolean) as Array<{ id: string; lat: number; lng: number; shop: ShopDoc }>;
  }, [shops]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
        {points.map((p) => {
          const name = String((p.shop as any).name ?? "shop");

          return (
            <Marker
              key={p.id || `${p.lat},${p.lng}`}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              // ピン押した瞬間に遷移しない（←ここが重要）
              // 遷移は “詳細を見る” ボタンでやる
            >
              {/* Apple Mapsっぽい「吹き出し」 */}
              <Callout tooltip>
                <View style={styles.calloutOuter}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.title} numberOfLines={1}>
                      {name}
                    </Text>

                    <Pressable
                      onPress={() => onOpenDetail?.(p.shop)}
                      style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
                      hitSlop={8}
                    >
                      <Text style={styles.detailText}>▶ 詳細を見る</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => onOpenDirections?.(p.shop)}
                      style={({ pressed }) => [styles.routeBtn, pressed && styles.pressedBtn]}
                      hitSlop={8}
                    >
                      <Text style={styles.routeText}>経路案内</Text>
                    </Pressable>
                  </View>

                  {/* 吹き出しの“しっぽ” */}
                  <View style={styles.tail} />
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  calloutOuter: {
    alignItems: "flex-start",
  },

  calloutCard: {
    width: 190,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
  },

  detailRow: {
    alignSelf: "flex-start",
  },
  detailText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },

  routeBtn: {
    backgroundColor: "black",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  routeText: {
    color: "white",
    fontWeight: "900",
  },

  tail: {
    width: 0,
    height: 0,
    marginLeft: 24,
    marginTop: -1,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "white",
    // 影を少しだけ（iOS/Android差があるので控えめ）
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }
      : { elevation: 2 }),
  },

  pressed: { opacity: 0.6 },
  pressedBtn: { opacity: 0.85 },
});