// components/ShopMap.native.tsx
import { useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";

import type { ShopDoc } from "../types/shop";

type Props = {
  shops: ShopDoc[];
  initialRegion: Region;
  onOpenDetail: (shop: ShopDoc) => void;
  onOpenDirections: (shop: ShopDoc) => void;
};

export default function ShopMapNative({
  shops,
  initialRegion,
  onOpenDetail,
  onOpenDirections,
}: Props) {
  const mapRef = useRef<MapView>(null);

  const markers = useMemo(() => {
    return (shops ?? [])
      .map((s) => {
        const lat = Number((s as any).lat);
        const lng = Number((s as any).lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { s, lat, lng };
      })
      .filter(Boolean) as { s: ShopDoc; lat: number; lng: number }[];
  }, [shops]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
      >
        {markers.map(({ s, lat, lng }) => (
          <Marker
            key={String((s as any).id)}
            coordinate={{ latitude: lat, longitude: lng }}
          >
            <Callout tooltip>
              <View style={styles.card}>
                <Text style={styles.title}>{(s as any).name}</Text>

                <TouchableOpacity
                  style={styles.link}
                  onPress={() => onOpenDetail(s)}
                >
                  <Text style={styles.linkText}>詳細を見る</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nav}
                  onPress={() => onOpenDirections(s)}
                >
                  <Text style={styles.navText}>経路案内</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  card: {
    width: 220,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  title: { fontSize: 16, fontWeight: "900", marginBottom: 6 },
  link: { paddingVertical: 6 },
  linkText: { color: "#1d4ed8", fontWeight: "900" },
  nav: {
    marginTop: 8,
    backgroundColor: "black",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  navText: { color: "white", fontWeight: "900" },
});
