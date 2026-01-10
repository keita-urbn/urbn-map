// components/ShopMap.web.tsx
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { ShopDoc } from "../types/shop";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

// デフォルトアイコンが崩れる対策
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -36],
  shadowSize: [41, 41],
});
(L.Marker.prototype as any).options.icon = DefaultIcon;

function ClickCatcher({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

type Props = {
  shops: ShopDoc[];
  selectedId: string | null;
  onSelect: (shop: ShopDoc) => void;
  onMapClick: () => void;

  // ✅ Webだけで「詳細/経路」押したい場合（親から渡す）
  onOpenDetail?: (shop: ShopDoc) => void;
  onOpenDirections?: (shop: ShopDoc) => void;
};

export default function ShopMapWeb({
  shops,
  selectedId,
  onSelect,
  onMapClick,
  onOpenDetail,
  onOpenDirections,
}: Props) {
  const markers = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = Number(s?.lat);
        const lng = Number(s?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const id = String(s?.id ?? s?.docId ?? s?.shopId ?? "");
        return { shop: s as ShopDoc, lat, lng, id: id || `${lat},${lng}` };
      })
      .filter(Boolean) as Array<{ shop: ShopDoc; lat: number; lng: number; id: string }>;
  }, [shops]);

  // とりあえず東京駅
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
          >
            {/* ✅ 選択中のマーカーだけPopupを出す（元の小さいカード） */}
            {selectedId === id && (
              <Popup closeButton={false} autoClose={false} closeOnClick={false}>
                <div style={popupCss.card}>
                  <div style={popupCss.title}>{(shop as any)?.name ?? "Shop"}</div>

                  <button
                    style={popupCss.linkBtn}
                    onClick={() => (onOpenDetail ? onOpenDetail(shop) : onSelect(shop))}
                    type="button"
                  >
                    詳細を見る
                  </button>

                  <button
                    style={popupCss.navBtn}
                    onClick={() =>
                      onOpenDirections ? onOpenDirections(shop) : onSelect(shop)
                    }
                    type="button"
                  >
                    経路案内
                  </button>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>

      {/* Leaflet標準の白枠を消して、カードに合わせる */}
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
  card: {
    width: 220,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #e5e5e5",
    boxSizing: "border-box",
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 6,
  },
  linkBtn: {
    display: "block",
    background: "transparent",
    border: "none",
    padding: "6px 0",
    margin: 0,
    color: "#1d4ed8",
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left" as const,
  },
  navBtn: {
    display: "block",
    width: "100%",
    marginTop: 8,
    background: "black",
    color: "white",
    border: "none",
    borderRadius: 12,
    padding: "10px 0",
    fontWeight: 900,
    cursor: "pointer",
  },
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { width: "100%", height: "100%" },
});
