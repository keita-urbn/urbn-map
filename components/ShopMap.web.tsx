import { rankMarkers, placeMarkers, PRIORITY_COLORS, type Priority } from "../lib/markerPriority";
import { STATUS_ACCENTS, type OpeningStatus } from "../lib/businessHours";
// components/ShopMap.web.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { ShopDoc } from "../types/shop";


// ⚠️ Leaflet and react-leaflet are NOT imported at the top level.
// Both packages access `window` / `document` at import time, which crashes
// during SSR / Expo web module initialisation.
// All Leaflet types are imported via `import type` (erased at runtime) and
// the actual values are loaded dynamically inside useEffect.

import type {
    MapContainer as MapContainerType,
    Marker as MarkerType,
    TileLayer as TileLayerType,
    useMapEvents as useMapEventsType,
} from "react-leaflet";

/**
 * ✅ 重要
 * leaflet.css はここで import しない。
 * app/(tabs)/_layout.tsx で `import "leaflet/dist/leaflet.css";` を読み込む。
 */

function injectCssOnce() {
  if (typeof document === "undefined" || document.getElementById("urbn-map-css")) return;
  const style = document.createElement("style");
  style.id = "urbn-map-css";
  style.textContent = ".leaflet-container { background: #0b0b0c; }";
  document.head.appendChild(style);
}

let leaflet: typeof import("leaflet") | null = null;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function shopIcon(shop: ShopDoc, priority: Priority, selected: boolean, status: OpeningStatus, label: boolean) {
  const image = shop.mapIconUrl && /^https:\/\//.test(shop.mapIconUrl) ? `<img alt="" src="${escapeHtml(shop.mapIconUrl)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover"/>` : '<span style="font-size:24px">▣</span>';
  return leaflet!.divIcon({ className: 'urbn-marker', iconSize: [48,48], iconAnchor: [24,24], html: `<div style="position:relative;width:48px;height:48px;border-radius:50%;background:${PRIORITY_COLORS[priority.tier]}66;display:flex;align-items:center;justify-content:center;box-sizing:border-box;${selected ? 'border:2px solid #ef4444;' : ''}"><span style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;overflow:hidden">${image}</span><span style="position:absolute;right:1px;bottom:1px;width:9px;height:9px;background:${STATUS_ACCENTS[status]};border:1.5px solid white;border-radius:50%"></span>${label ? `<span style="position:absolute;left:52px;top:6px;width:125px;font:700 12px/18px sans-serif;color:#111;text-shadow:0 0 3px white;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(shop.name)}</span>` : ''}</div>` });
}
function ClickCatcher({
  onMapClick,
  useMapEvents,
  selected,
  onViewport,
}: {
  onViewport: (map: import("leaflet").Map) => void;
  onMapClick: () => void;
  selected: ShopDoc | null;
  useMapEvents: typeof useMapEventsType;
}) {
  const map = useMapEvents({ click: () => onMapClick(), moveend: e => onViewport(e.target), zoomend: e => onViewport(e.target) });
  useEffect(() => { onViewport(map); }, [map, onViewport]);
  useEffect(() => {
    if (!selected) return;
    const point = map.project([Number(selected.lat), Number(selected.lng)]);
    point.y += 110;
    map.panTo(map.unproject(point), { animate: true });
  }, [map, selected]);
  return null;
}

function idOf(s: any) {
  return String(s?.id ?? s?.docId ?? "");
}

// ── Dynamically-loaded react-leaflet components ───────────────────────────────
// We store them in module-level refs so they are only imported once.
let _MapContainer: typeof MapContainerType | null = null;
let _Marker: typeof MarkerType | null = null;
let _TileLayer: typeof TileLayerType | null = null;
let _useMapEvents: typeof useMapEventsType | null = null;

export default function ShopMapWeb({
  shops,
  priorityShops = shops,
  statusById,
  selected,
  initialRegion,
  onSelect,
}: {
  shops: ShopDoc[];
  priorityShops?: ShopDoc[];
  statusById: Record<string, OpeningStatus>;
  selected: ShopDoc | null;
  initialRegion: { latitude: number; longitude: number };
  onSelect: (shop: ShopDoc | null) => void;
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
      leaflet = L;

      _MapContainer = rl.MapContainer;
      _Marker = rl.Marker;
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
      .filter(Boolean) as { shop: ShopDoc; lat: number; lng: number; id: string }[];
  }, [shops]);

  const priorities = useMemo(() => rankMarkers(priorityShops), [priorityShops]);
  const [viewport, setViewport] = useState<{ center: [number, number]; zoom: number; width: number; height: number } | null>(null);
  const onViewport = useCallback((map: import('leaflet').Map) => { const center = map.getCenter(); const size = map.getSize(); setViewport({ center: [center.lat, center.lng], zoom: map.getZoom(), width: size.x, height: size.y }); }, []);
  const placed = useMemo(() => {
    if (!leaflet || !viewport) return [];
    const center = leaflet.CRS.EPSG3857.latLngToPoint(leaflet.latLng(...viewport.center), viewport.zoom);
    return placeMarkers(markers.map(({ shop, lat, lng }) => { const p = leaflet!.CRS.EPSG3857.latLngToPoint(leaflet!.latLng(lat, lng), viewport.zoom); return { shop, x: p.x - center.x + viewport.width / 2, y: p.y - center.y + viewport.height / 2 }; }).filter(p => p.shop.id === selected?.id || p.x >= -80 && p.x <= viewport.width + 80 && p.y >= -80 && p.y <= viewport.height + 80), priorities, viewport.zoom, selected?.id);
  }, [markers, priorities, selected?.id, viewport]);
  const rendered = useMemo(() => placed.map(p => ({ ...p, icon: shopIcon(p.shop, priorities[p.shop.id], selected?.id === p.shop.id, statusById[p.shop.id] ?? 'unknown', p.label) })), [placed, priorities, selected?.id, statusById]);
  const center: [number, number] = [initialRegion.latitude, initialRegion.longitude];

  // Show nothing (or a lightweight placeholder) until Leaflet is ready
  if (
    !leafletReady ||
    !_MapContainer ||
    !_Marker ||
    !_TileLayer ||
    !_useMapEvents
  ) {
    return <View style={styles.root} />;
  }

  const MapContainer = _MapContainer;
  const Marker = _Marker;
  const TileLayer = _TileLayer;
  const useMapEventsLocal = _useMapEvents;


  return (
    <View style={styles.root}>
      <MapContainer center={center} zoom={12} zoomControl={false} style={styles.map as any}>
        <ClickCatcher onViewport={onViewport} selected={selected} onMapClick={() => onSelect(null)} useMapEvents={useMapEventsLocal} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {rendered.map(({ shop, icon }) => (
          <Marker key={shop.id} position={[shop.lat, shop.lng]} icon={icon} zIndexOffset={selected?.id === shop.id ? 1000 : Math.round(priorities[shop.id].score * 100)}
            eventHandlers={{ click: () => onSelect(shop) }} bubblingMouseEvents={false} />
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { width: "100%", height: "100%" },
});
