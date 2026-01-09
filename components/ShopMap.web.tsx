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

export default function ShopMapWeb({ shops, selectedId, onSelect }: Props) {
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

  // Big + rational map height for web:
  // - Use almost full viewport
  // - Keep minHeight so it never becomes tiny
  // - Keep borderRadius for nice UI
  const mapStyle: React.CSSProperties = useMemo(
    () => ({
      width: "100%",
      // ✅ main control point: increase/decrease this offset if you want more/less map
      height: "calc(100vh - 220px)",
      minHeight: 420,
      maxHeight: 920,
      borderRadius: 18,
      overflow: "hidden",
      background: "#f3f4f6",
    }),
    []
  );

  useEffect(() => {
    let disposed = false;

    (async () => {
      if (!divRef.current) return;

      // 1) Load leaflet + css (for web)
      await import("leaflet/dist/leaflet.css");
      const L = await import("leaflet");

      if (disposed) return;

      // 2) Fix default icon paths using CDN (avoid import.meta / bundler issues)
      //    (This is the most stable setup for Expo Web + Netlify)
      const DefaultIcon = (L as any).Icon.Default;
      if (DefaultIcon) {
        DefaultIcon.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
      }

      // 3) Create map once
      if (!mapRef.current) {
        // clear old DOM to prevent duplicate maps (hot reload safety)
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

        // markers layer group
        const layer = (L as any).layerGroup().addTo(map);

        mapRef.current = map;
        markersLayerRef.current = layer;

        // initial view: Tokyo
        map.setView([35.681236, 139.767125], 12);
      }

      // 4) Render markers (rebuild each time points changes)
      const map = mapRef.current;
      const layer = markersLayerRef.current;

      if (!map || !layer) return;

      layer.clearLayers();

      // Custom "high-visibility" marker (black outline + white fill + center dot)
      const makePinIcon = (isSelected: boolean) => {
        const size = isSelected ? 38 : 34;
        const dot = isSelected ? 10 : 9;
        const ring = isSelected ? 4 : 3;

        // SVG pin (sharp + visible on any map style)
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
          iconAnchor: [size / 2, size], // bottom center
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

        marker.on("click", () => {
          onSelect?.(p.id);
        });
      });

      // 5) Auto-fit bounds (only if we have points)
      if (points.length > 0) {
        const bounds = (L as any).latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [28, 28] });
      } else {
        map.setView([35.681236, 139.767125], 12);
      }

      // 6) Invalidate size (important when height is calc/vh)
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 50);
    })();

    return () => {
      disposed = true;
      // keep map instance for fast re-render; if you want full destroy:
      // try { mapRef.current?.remove(); } catch {}
      // mapRef.current = null; markersLayerRef.current = null;
    };
  }, [points, selectedId, onSelect]);

  return (
    <View style={{ flex: 1 }}>
      <div ref={divRef} style={mapStyle} />
    </View>
  );
}

// Basic HTML escape for popup safety
function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}