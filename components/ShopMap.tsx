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

export default function ShopMap({
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
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{(s as any).name}</Text>

                <TouchableOpacity
                  onPress={() => onOpenDetail(s)}
                  style={styles.calloutLink}
                >
                  <Text style={styles.calloutLinkText}>詳細を見る</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onOpenDirections(s)}
                  style={styles.calloutNav}
                >
                  <Text style={styles.calloutNavText}>経路案内</Text>
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

  callout: {
    width: 220,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  calloutTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  calloutLink: { paddingVertical: 6 },
  calloutLinkText: { color: "#1d4ed8", fontWeight: "800" },
  calloutNav: {
    marginTop: 8,
    backgroundColor: "black",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  calloutNavText: { color: "white", fontWeight: "900" },
});
