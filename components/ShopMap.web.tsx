// components/ShopMap.web.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import type { ShopDoc } from "../types/shop";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

type Props = {
  shops: ShopDoc[];
  initialRegion?: Region;
  onOpenDetail?: (shop: ShopDoc) => void;
  onOpenDirections?: (shop: ShopDoc) => void;
};

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ShopMapWeb({
  shops,
  initialRegion,
  onOpenDetail,
}: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);

  // Leaflet instances
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const points = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = toNum(s.lat);
        const lng = toNum(s.lng);
        if (lat == null || lng == null) return null;
        return { id: String(s.id), lat, lng, shop: s as ShopDoc };
      })
      .filter(Boolean) as Array<{ id: string; lat: number; lng: number; shop: ShopDoc }>;
  }, [shops]);

  // ✅ Webだけ「ちょい拡張」しつつ、検索UIが隠れない高さにする
  // - index.tsx 側の searchWrap(top:12) + badge(top:62) を潰さない余白を確保
  // - 下は余白なし寄せ（Tabバーはページ外なのでここでは無理に引かない）
  const mapStyle: React.CSSProperties = useMemo(
    () => ({
      width: "100%",
      height: "calc(100vh - 190px)", // ← 220pxより少しだけ広げる（UIを隠しにくい妥当ライン）
      minHeight: 460,
      maxHeight: 980,
      borderRadius: 18,
      overflow: "hidden",
      background: "#f3f4f6",
      position: "relative",
      zIndex: 0, // ✅ mapが上に被さる事故を避ける
    }),
    []
  );

  useEffect(() => {
    let disposed = false;

    (async () => {
      if (!divRef.current) return;

      await import("leaflet/dist/leaflet.css");
      const L = await import("leaflet");
      if (disposed) return;

      // default icon fix (CDN)
      const DefaultIcon = (L as any).Icon.Default;
      if (DefaultIcon) {
        DefaultIcon.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
      }

      if (!mapRef.current) {
        divRef.current.innerHTML = "";

        const map = (L as any).map(divRef.current, {
          zoomControl: true,
          attributionControl: true,
        });

        (L as any)
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          })
          .addTo(map);

        const layer = (L as any).layerGroup().addTo(map);
        mapRef.current = map;
        markersLayerRef.current = layer;

        const centerLat = initialRegion?.latitude ?? 35.681236;
        const centerLng = initialRegion?.longitude ?? 139.767125;
        map.setView([centerLat, centerLng], 12);
      }

      const map = mapRef.current;
      const layer = markersLayerRef.current;
      if (!map || !layer) return;

      layer.clearLayers();

      // high-visibility pin
      const makePinIcon = () => {
        const size = 34;
        const dot = 9;
        const ring = 3;

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
  <path d="M24 46s16-14.3 16-27A16 16 0 0 0 8 19c0 12.7 16 27 16 27z"
        fill="white" stroke="black" stroke-width="${ring}" />
  <circle cx="24" cy="19" r="${dot}" fill="black" />
</svg>`.trim();

        return (L as any).divIcon({
          className: "urbn-pin",
          html: `<div style="transform: translate(-50%, -100%);">${svg}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
        });
      };

      points.forEach((p) => {
        const marker = (L as any)
          .marker([p.lat, p.lng], { icon: makePinIcon() })
          .addTo(layer);

        const name = String((p.shop as any).name ?? "Shop");
        const area = (p.shop as any).area ? String((p.shop as any).area) : "";

        const popupHtml = `
<div style="min-width: 180px;">
  <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(name)}</div>
  ${area ? `<div style="opacity:0.85;">📍 ${escapeHtml(area)}</div>` : ""}
  <div style="opacity:0.7; margin-top:8px;">クリックで詳細へ</div>
</div>
`.trim();

        marker.bindPopup(popupHtml);

        // ✅ ここが本命：MapScreenの openDetail を呼ぶ
        marker.on("click", () => {
          try {
            marker.openPopup();
          } catch {}
          onOpenDetail?.(p.shop);
        });
      });

      // fit bounds
      if (points.length > 0) {
        const bounds = (L as any).latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [28, 28] });
      }

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 50);
    })();

    return () => {
      disposed = true;
    };
  }, [points, initialRegion, onOpenDetail]);

  return (
    <View style={{ flex: 1 }}>
      <div ref={divRef} style={mapStyle} />
    </View>
  );
}

function escapeHtml(str: string) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}