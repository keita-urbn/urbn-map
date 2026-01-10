// components/ShopMap.web.tsx
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { ShopDoc } from "../types/shop";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

// デフォルトアイコンが崩れる対策
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
(L.Marker.prototype as any).options.icon = DefaultIcon;

function ClickCatcher({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

export default function ShopMapWeb({
  shops,
  selectedId,
  onSelect,
  onMapClick,
}: {
  shops: ShopDoc[];
  selectedId: string | null;
  onSelect: (shop: ShopDoc) => void;
  onMapClick: () => void;
}) {
  const markers = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = Number(s.lat);
        const lng = Number(s.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { shop: s as ShopDoc, lat, lng, id: String(s.id) };
      })
      .filter(Boolean) as Array<{ shop: ShopDoc; lat: number; lng: number; id: string }>;
  }, [shops]);

  const center: [number, number] = [35.681236, 139.767125];

  return (
    <View style={styles.root}>
      <MapContainer center={center} zoom={12} style={styles.map as any}>
        <ClickCatcher onMapClick={onMapClick} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map(({ shop, lat, lng, id }) => (
          <Marker
            key={id}
            position={[lat, lng]}
            eventHandlers={{
              click: () => onSelect(shop),
            }}
          />
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { width: "100%", height: "100%" },
});