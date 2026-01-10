// components/ShopMap.web.tsx
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { ShopDoc } from "../types/shop";

import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

// --- CSS（吹き出しの見た目をアプリ寄せ） ---
let _shopPopupCssInjected = false;
function injectPopupCssOnce() {
  if (typeof document === "undefined") return;
  if (_shopPopupCssInjected) return;
  _shopPopupCssInjected = true;

  const style = document.createElement("style");
  style.innerHTML = `
  .shop-popup .leaflet-popup-content-wrapper{
    border-radius: 18px;
    background: rgba(255,255,255,0.95);
    border: 1px solid #e5e5e5;
    box-shadow: 0 10px 30px rgba(0,0,0,0.18);
  }
  .shop-popup .leaflet-popup-content{
    margin: 12px 14px;
    width: 240px;
  }
  .shop-popup .leaflet-popup-tip{
    background: rgba(255,255,255,0.95);
    border: 1px solid #e5e5e5;
  }
  .shop-popup .leaflet-popup-close-button{
    display: none;
  }

  .shopPopupTitle{
    font-size: 18px;
    font-weight: 900;
    margin: 0 0 6px 0;
  }
  .shopPopupMeta{
    font-size: 12px;
    font-weight: 800;
    color: #6b7280;
    margin: 0 0 10px 0;
  }
  .shopPopupLink{
    display: inline-block;
    color: #1d4ed8;
    font-weight: 900;
    text-decoration: none;
    margin-bottom: 12px;
    cursor: pointer;
  }
  .shopPopupBtn{
    width: 100%;
    border: none;
    border-radius: 14px;
    padding: 14px 12px;
    background: #000;
    color: #fff;
    font-weight: 900;
    cursor: pointer;
  }
  .shopPopupClose{
    display: block;
    margin-top: 10px;
    text-align: right;
    color: #6b7280;
    font-weight: 800;
    cursor: pointer;
    user-select: none;
  }
  `;
  document.head.appendChild(style);
}

// --- Leafletアイコン（通常=青 / 選択中=赤） ---
const IconBlue = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const IconRed = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// マップクリックで閉じる
function ClickCatcher({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

function idOf(s: any) {
  return String(s?.id ?? s?.docId ?? "");
}

function textOf(v: any) {
  return (v ?? "").toString();
}

// 選択中のときPopupを自動で開くMarker
function ShopMarker({
  shop,
  lat,
  lng,
  selected,
  onSelect,
  onOpenDetail,
  onOpenDirections,
  onClose,
}: {
  shop: ShopDoc;
  lat: number;
  lng: number;
  selected: boolean;
  onSelect: (shop: ShopDoc) => void;
  onOpenDetail: (shop: ShopDoc) => void;
  onOpenDirections: (shop: ShopDoc) => void;
  onClose: () => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    if (!markerRef.current) return;
    if (selected) {
      markerRef.current.openPopup();
    } else {
      markerRef.current.closePopup();
    }
  }, [selected]);

  const name = textOf((shop as any)?.name);
  const area = textOf((shop as any)?.area);
  const genre = textOf((shop as any)?.genre);
  const meta = [area, genre].filter(Boolean).join(" • ");

  return (
    <Marker
      ref={(r) => {
        markerRef.current = r as any;
      }}
      position={[lat, lng]}
      icon={selected ? IconRed : IconBlue}
      eventHandlers={{
        click: () => onSelect(shop),
      }}
    >
      <Popup
        className="shop-popup"
        closeButton={false}
        autoPan={true}
        closeOnClick={false}
      >
        <div>
          <div className="shopPopupTitle">{name}</div>
          {meta ? <div className="shopPopupMeta">{meta}</div> : null}

          <span className="shopPopupLink" onClick={() => onOpenDetail(shop)}>
            詳細を見る
          </span>

          <button className="shopPopupBtn" onClick={() => onOpenDirections(shop)}>
            経路案内
          </button>

          <span className="shopPopupClose" onClick={onClose}>
            閉じる
          </span>
        </div>
      </Popup>
    </Marker>
  );
}

export default function ShopMapWeb({
  shops,
  selectedId,
  onSelectId,
  onOpenDetail,
  onOpenDirections,
}: {
  shops: ShopDoc[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onOpenDetail: (shop: ShopDoc) => void;
  onOpenDirections: (shop: ShopDoc) => void;
}) {
  useEffect(() => {
    injectPopupCssOnce();
  }, []);

  const markers = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = Number(s?.lat);
        const lng = Number(s?.lng);
        const id = idOf(s);
        if (!id) return null;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { shop: s as ShopDoc, lat, lng, id };
      })
      .filter(Boolean) as Array<{ shop: ShopDoc; lat: number; lng: number; id: string }>;
  }, [shops]);

  const center: [number, number] = [35.681236, 139.767125];

  return (
    <View style={styles.root}>
      <MapContainer center={center} zoom={12} style={styles.map as any}>
        <ClickCatcher onMapClick={() => onSelectId(null)} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map(({ shop, lat, lng, id }) => (
          <ShopMarker
            key={id}
            shop={shop}
            lat={lat}
            lng={lng}
            selected={selectedId === id}
            onSelect={() => onSelectId(id)}
            onOpenDetail={onOpenDetail}
            onOpenDirections={onOpenDirections}
            onClose={() => onSelectId(null)}
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