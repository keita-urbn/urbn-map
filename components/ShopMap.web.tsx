// components/ShopMap.web.tsx
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ShopDoc } from "../types/shop";

type Props = {
  shops: ShopDoc[];
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onOpenDetail: (shop: ShopDoc) => void;
  onOpenDirections: (shop: ShopDoc) => void;
};

// Leaflet default icon fix (Vite/Expo Web でアイコンが消える対策)
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -36],
  shadowSize: [41, 41],
});

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function shopId(s: any) {
  return String(s?.id ?? s?.docId ?? s?.shopId ?? s?.uid ?? "");
}

export default function ShopMap({
  shops,
  initialRegion,
  onOpenDetail,
  onOpenDirections,
}: Props) {
  const markers = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = toNum(s?.lat);
        const lng = toNum(s?.lng);
        if (lat == null || lng == null) return null;
        return { s: s as ShopDoc, lat, lng, key: shopId(s) || `${lat},${lng}` };
      })
      .filter(Boolean) as { s: ShopDoc; lat: number; lng: number; key: string }[];
  }, [shops]);

  // RNのRegion → Leafletの中心 & zoom（ざっくり）
  const center: [number, number] = [
    initialRegion.latitude,
    initialRegion.longitude,
  ];

  // latitudeDelta が小さいほどズームを上げる
  const zoom =
    initialRegion.latitudeDelta <= 0.05
      ? 13
      : initialRegion.latitudeDelta <= 0.15
      ? 12
      : 11;

  return (
    <View style={styles.container}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map(({ s, lat, lng, key }) => (
          <Marker
            key={key}
            position={[lat, lng]}
            icon={DefaultIcon}
          >
            {/* LeafletのPopupを「元の小さいカード」風にする */}
            <Popup className="shop-popup" closeButton={false}>
              <div style={popupCss.wrap}>
                <div style={popupCss.title}>{(s as any).name}</div>

                <Pressable
                  onPress={() => onOpenDetail(s)}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkText}>詳細を見る</Text>
                </Pressable>

                <Pressable
                  onPress={() => onOpenDirections(s)}
                  style={styles.navBtn}
                >
                  <Text style={styles.navText}>経路案内</Text>
                </Pressable>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Popupの余計な白枠を消す（leaflet標準） */}
      <style>{`
        .leaflet-popup-content-wrapper{
          background: transparent;
          box-shadow: none;
          border-radius: 0;
        }
        .leaflet-popup-content{
          margin: 0;
        }
        .leaflet-popup-tip{
          background: rgba(255,255,255,0.95);
          border: 1px solid #e5e5e5;
        }
      `}</style>
    </View>
  );
}

const popupCss: Record<string, any> = {
  wrap: {
    width: 220,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #e5e5e5",
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 6,
  },
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  linkBtn: { paddingVertical: 6 },
  linkText: { color: "#1d4ed8", fontWeight: "800" },

  navBtn: {
    marginTop: 8,
    backgroundColor: "black",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  navText: { color: "white", fontWeight: "900" },
});
