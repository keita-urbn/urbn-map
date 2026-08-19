// components/ShopMap.web.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { ShopDoc } from "../types/shop";

// ⚠️ Leaflet and react-leaflet are NOT imported at the top level.
// Both packages access `window` / `document` at import time, which crashes
// during SSR / Expo web module initialisation.
// All Leaflet types are imported via `import type` (erased at runtime) and
// the actual values are loaded dynamically inside useEffect.
import type { Icon as LeafletIcon, Marker as LeafletMarker } from "leaflet";
import type {
    MapContainer as MapContainerType,
    Marker as MarkerType,
    Popup as PopupType,
    TileLayer as TileLayerType,
    useMapEvents as useMapEventsType,
} from "react-leaflet";

/**
 * ✅ 重要
 * leaflet.css はここで import しない。
 * app/(tabs)/_layout.tsx で `import "leaflet/dist/leaflet.css";` を読み込む。
 */

// --- CSS（吹き出し + 地図の背景） ---
let _shopPopupCssInjected = false;
function injectCssOnce() {
  if (typeof document === "undefined") return;
  if (_shopPopupCssInjected) return;
  _shopPopupCssInjected = true;

  const style = document.createElement("style");
  style.innerHTML = `
  /* ✅ 白残りの本丸：leafletのコンテナ背景を黒に固定 */
  .leaflet-container{
    background: #0b0b0c;
  }

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
    margin: 0 0 4px 0;
  }
  .shopPopupRating{
    font-size: 13px;
    font-weight: 800;
    color: #111;
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

// ✅ 吹き出し位置：ピンに被らないよう上へ（先端をピン先端へ）
const POPUP_OFFSET: [number, number] = [0, -36];

// --- Leaflet icons (created lazily — must not call L.icon at module level) ---
// Populated once by the root component's useEffect after dynamic import.
let _iconBlue: LeafletIcon | null = null;
let _iconRed: LeafletIcon | null = null;

function getIcons(L: typeof import("leaflet")) {
  if (!_iconBlue) {
    _iconBlue = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
  }
  if (!_iconRed) {
    _iconRed = L.icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
  }
  return { IconBlue: _iconBlue!, IconRed: _iconRed! };
}

function ClickCatcher({
  onMapClick,
  useMapEvents,
}: {
  onMapClick: () => void;
  useMapEvents: typeof useMapEventsType;
}) {
  useMapEvents({ click: () => onMapClick() });
  return null;
}

function idOf(s: any) {
  return String(s?.id ?? s?.docId ?? "");
}
function textOf(v: any) {
  return (v ?? "").toString();
}

function ShopMarker({
  shop,
  lat,
  lng,
  selected,
  onSelect,
  onOpenDetail,
  onOpenDirections,
  onClose,
  isFavorite,
  toggleFavorite,
  Marker,
  Popup,
  iconBlue,
  iconRed,
}: {
  shop: ShopDoc;
  lat: number;
  lng: number;
  selected: boolean;
  onSelect: (shop: ShopDoc) => void;
  onOpenDetail: (shop: ShopDoc) => void;
  onOpenDirections: (shop: ShopDoc) => void;
  onClose: () => void;
  isFavorite?: (shopId: string) => boolean;
  toggleFavorite?: (shopId: string) => void;
  Marker: typeof MarkerType;
  Popup: typeof PopupType;
  iconBlue: LeafletIcon;
  iconRed: LeafletIcon;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    if (!markerRef.current) return;
    if (selected) markerRef.current.openPopup();
    else markerRef.current.closePopup();
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
      icon={selected ? iconRed : iconBlue}
      eventHandlers={{ click: () => onSelect(shop) }}
    >
      <Popup
        className="shop-popup"
        closeButton={false}
        autoPan={true}
        closeOnClick={false}
        offset={POPUP_OFFSET}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div className="shopPopupTitle" style={{ margin: 0 }}>{name}</div>
            {toggleFavorite && (
              <span
                onClick={() => toggleFavorite(idOf(shop))}
                style={{ cursor: "pointer", fontSize: 20, marginLeft: 8, userSelect: "none" }}
              >
                {isFavorite?.(idOf(shop)) ? "❤️" : "🤍"}
              </span>
            )}
          </div>
          {meta ? <div className="shopPopupMeta">{meta}</div> : null}
          <div className="shopPopupRating">
            ★ {((shop as any)?.ratingAverage ?? 0).toFixed(1)} ({(shop as any)?.ratingCount ?? 0})
          </div>

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

// ── Dynamically-loaded react-leaflet components ───────────────────────────────
// We store them in module-level refs so they are only imported once.
let _MapContainer: typeof MapContainerType | null = null;
let _Marker: typeof MarkerType | null = null;
let _Popup: typeof PopupType | null = null;
let _TileLayer: typeof TileLayerType | null = null;
let _useMapEvents: typeof useMapEventsType | null = null;

export default function ShopMapWeb({
  shops,
  selectedId,
  onSelect,
  onOpenDetail,
  onOpenDirections,
  isFavorite,
  toggleFavorite,
}: {
  shops: ShopDoc[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenDetail: (shop: ShopDoc) => void;
  onOpenDirections: (shop: ShopDoc) => void;
  isFavorite?: (shopId: string) => boolean;
  toggleFavorite?: (shopId: string) => void;
}) {
  // Gate rendering: only true once Leaflet + react-leaflet have been loaded
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    injectCssOnce();

    // Dynamic import — runs only in the browser, never during SSR
    Promise.all([
      import("leaflet"),
      import("react-leaflet"),
    ]).then(([L, rl]) => {
      getIcons(L); // initialise icon singletons
      _MapContainer = rl.MapContainer;
      _Marker = rl.Marker;
      _Popup = rl.Popup;
      _TileLayer = rl.TileLayer;
      _useMapEvents = rl.useMapEvents;
      setLeafletReady(true);
    });
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

  // Show nothing (or a lightweight placeholder) until Leaflet is ready
  if (
    !leafletReady ||
    !_MapContainer ||
    !_Marker ||
    !_Popup ||
    !_TileLayer ||
    !_useMapEvents ||
    !_iconBlue ||
    !_iconRed
  ) {
    return <View style={styles.root} />;
  }

  const MapContainer = _MapContainer;
  const Marker = _Marker;
  const Popup = _Popup;
  const TileLayer = _TileLayer;
  const useMapEventsLocal = _useMapEvents;
  const iconBlue = _iconBlue;
  const iconRed = _iconRed;

  return (
    <View style={styles.root}>
      <MapContainer center={center} zoom={12} style={styles.map as any}>
        <ClickCatcher onMapClick={() => onSelect(null)} useMapEvents={useMapEventsLocal} />

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
            onSelect={() => onSelect(id)}
            onOpenDetail={onOpenDetail}
            onOpenDirections={onOpenDirections}
            onClose={() => onSelect(null)}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
            Marker={Marker}
            Popup={Popup}
            iconBlue={iconBlue}
            iconRed={iconRed}
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