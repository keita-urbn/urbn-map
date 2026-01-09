// components/ShopMap.web.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import type { ShopDoc } from "../types/shop";

type Props = {
  shops: ShopDoc[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ===== 調整ポイント（ここだけ触ればOK）=====
const BOTTOM_GAP_PX = 8; // ✅ 下の余白。0に近いほど「下余白なし」になる（0でもOK）
const MIN_HEIGHT = 420;
const MAX_HEIGHT = 980;
const RADIUS = 18;
// ============================================

export default function ShopMapWeb({ shops, selectedId, onSelect }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);

  // Leaflet instances (keep across renders)
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const points = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = toNum(s.lat);
        const lng = toNum(s.lng);
        if (lat == null || lng == null) return null;
        return { id: String(s.id), lat, lng, shop: s };
      })
      .filter(Boolean) as Array<{ id: string; lat: number; lng: number; shop: any }>;
  }, [shops]);

  // ✅ map自身は常に親(wrap)に100%で追従させる（vh/calcは使わない）
  const mapStyle: React.CSSProperties = useMemo(
    () => ({
      width: "100%",
      height: "100%",
      borderRadius: RADIUS,
      overflow: "hidden",
      background: "#f3f4f6",
    }),
    []
  );

  // ✅ 画面の残り高さを計算して、地図を「少し拡張」しつつUIは絶対に隠さない
  useEffect(() => {
    const setHeight = () => {
      const wrap = wrapperRef.current;
      if (!wrap) return;

      const rect = wrap.getBoundingClientRect();
      // ビューポート残り（= 画面下まで）- 少しだけ隙間（BOTTOM_GAP_PX）
      let h = window.innerHeight - rect.top - BOTTOM_GAP_PX;

      // clamp
      h = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.floor(h)));
      wrap.style.height = `${h}px`;

      // Leafletはサイズ変更を自動検知しないので強制再計算
      const map = mapRef.current;
      if (map) {
        queueMicrotask(() => {
          try {
            map.invalidateSize();
          } catch {}
        });
      }
    };

    setHeight();

    // リサイズ/ズーム/フォント読み込みなどでtopが微妙に変わるので少し追撃
    window.addEventListener("resize", setHeight);
    const t1 = window.setTimeout(setHeight, 80);
    const t2 = window.setTimeout(setHeight, 240);

    return () => {
      window.removeEventListener("resize", setHeight);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    (async () => {
      if (!divRef.current) return;

      // 1) Load leaflet + css (for web)
      await import("leaflet/dist/leaflet.css");
      const L = await import("leaflet");

      if (disposed) return;

      // 2) Fix default icon paths using CDN (avoid bundler issues)
      const DefaultIcon = (L as any).Icon.Default;
      if (DefaultIcon) {
        DefaultIcon.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
      }

      // 3) Create map once
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

        // initial view: Tokyo
        map.setView([35.681236, 139.767125], 12);

        // 初回もサイズ確定を強制
        setTimeout(() => {
          try {
            map.invalidateSize();
          } catch {}
        }, 0);
      }

      // 4) Render markers (rebuild each time points changes)
      const map = mapRef.current;
      const layer = markersLayerRef.current;
      if (!map || !layer) return;

      layer.clearLayers();

      const makePinIcon = (isSelected: boolean) => {
        const size = isSelected ? 38 : 34;
        const dot = isSelected ? 10 : 9;
        const ring = isSelected ? 4 : 3;

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
        const isSelected = selectedId ? String(selectedId) === p.id : false;

        const marker = (L as any)
          .marker([p.lat, p.lng], { icon: makePinIcon(isSelected) })
          .addTo(layer);

        const name = String((p.shop as any).name ?? "Shop");
        const area = (p.shop as any).area ? String((p.shop as any).area) : "";
        const address = (p.shop as any).address ? String((p.shop as any).address) : "";

        const popupHtml = `
<div style="min-width: 180px;">
  <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(name)}</div>
  ${area ? `<div style="opacity:0.85; margin-bottom:4px;">📍 ${escapeHtml(area)}</div>` : ""}
  ${address ? `<div style="opacity:0.75;">🏠 ${escapeHtml(address)}</div>` : ""}
</div>
`.trim();

        marker.bindPopup(popupHtml);
        marker.on("click", () => onSelect?.(p.id));
      });

      // 5) Auto-fit bounds
      if (points.length > 0) {
        const bounds = (L as any).latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [28, 28] });
      } else {
        map.setView([35.681236, 139.767125], 12);
      }

      // 6) Invalidate size
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 50);
    })();

    return () => {
      disposed = true;
    };
  }, [points, selectedId, onSelect]);

  return (
    <View style={{ flex: 1 }}>
      {/* ✅ wrapperの高さを「画面の残り」に合わせる */}
      <div ref={wrapperRef} style={{ width: "100%", minHeight: MIN_HEIGHT }}>
        <div ref={divRef} style={mapStyle} />
      </div>
    </View>
  );
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}