// components/ShopMap.web.tsx
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import type { ShopDoc } from "../types/shop";

type Props = {
  shops: ShopDoc[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

type LeafletModule = typeof import("leaflet");

function toNum(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function ensureMarkerStyle() {
  const STYLE_ID = "urbn-leaflet-marker-style";
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .urbn-pin{
      position: relative;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: #111;                 /* 本体：黒 */
      border: 3px solid #fff;           /* 白フチ：地図に埋もれない */
      box-shadow: 0 8px 18px rgba(0,0,0,.35);
      transform: translate(-11px, -11px);
      cursor: pointer;
    }

    /* 先端（ピンっぽい三角） */
    .urbn-pin::after{
      content:"";
      position:absolute;
      left: 50%;
      bottom: -9px;
      width: 0;
      height: 0;
      transform: translateX(-50%);
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 10px solid #111;
      filter: drop-shadow(0 6px 8px rgba(0,0,0,.25));
    }

    /* 中の点（視認性ブースト） */
    .urbn-pin .urbn-dot{
      position:absolute;
      inset: 0;
      margin:auto;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #2dd4bf;             /* アクセント：ティール */
      box-shadow: 0 0 0 2px rgba(255,255,255,.8);
    }

    /* 選択中：リングで「今どれ？」を明確化 */
    .urbn-pin.is-selected{
      box-shadow:
        0 10px 22px rgba(0,0,0,.35),
        0 0 0 6px rgba(45,212,191,.35); /* 発光リング */
      z-index: 9999;
    }

    /* Popupの文字も少し読みやすく */
    .urbn-popup-title{
      font-weight: 800;
      margin-bottom: 6px;
      font-size: 14px;
    }
    .urbn-popup-sub{
      opacity: .85;
      font-size: 12px;
      line-height: 1.4;
    }
  `;
  document.head.appendChild(style);
}

export default function ShopMapWeb({ shops, selectedId, onSelect }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<LeafletModule | null>(null);
  const markersRef = useRef<any[]>([]);

  const points = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => {
        const lat = toNum(s.lat);
        const lng = toNum(s.lng);
        if (lat == null || lng == null) return null;
        return { id: String(s.id ?? ""), lat, lng, shop: s };
      })
      .filter(Boolean) as Array<{ id: string; lat: number; lng: number; shop: any }>;
  }, [shops]);

  useEffect(() => {
    let disposed = false;

    (async () => {
      if (!divRef.current) return;

      ensureMarkerStyle();

      const L = (await import("leaflet")) as LeafletModule;
      if (disposed) return;

      LRef.current = L;

      // 既に map があるなら一旦破棄（HMR / 再描画対策）
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }

      // div初期化（LeafletがDOMを持つのでクリア推奨）
      divRef.current.innerHTML = "";

      const map = L.map(divRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // 初期位置：点があればfit、なければ渋谷
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [24, 24] });
      } else {
        map.setView([35.658034, 139.701636], 12);
      }
    })();

    return () => {
      disposed = true;
      // markers cleanup
      try {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
      } catch {}
      // map cleanup
      try {
        mapRef.current?.remove?.();
      } catch {}
      mapRef.current = null;
      LRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mapは初回だけ作る

  // マーカーの描画更新（shops/selectedId が変わったら差し替え）
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // 既存マーカー消す
    try {
      markersRef.current.forEach((m) => m.remove());
    } catch {}
    markersRef.current = [];

    // icon（選択時と通常でclassを変える）
    const makeIcon = (isSelected: boolean) =>
      L.divIcon({
        className: "", // Leaflet標準の余計なclassを消す
        html: `<div class="urbn-pin ${isSelected ? "is-selected" : ""}">
                 <div class="urbn-dot"></div>
               </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -14],
      });

    points.forEach((p) => {
      const isSelected = !!selectedId && String(selectedId) === String(p.id);

      const marker = L.marker([p.lat, p.lng], {
        icon: makeIcon(isSelected),
        keyboard: false,
        riseOnHover: true,
      }).addTo(map);

      const name = (p.shop as any).name ?? "Shop";
      const area = (p.shop as any).area ?? "";
      const address = (p.shop as any).address ?? "";

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <div class="urbn-popup-title">${escapeHtml(String(name))}</div>
          ${area ? `<div class="urbn-popup-sub">📍 ${escapeHtml(String(area))}</div>` : ""}
          ${address ? `<div class="urbn-popup-sub">🏠 ${escapeHtml(String(address))}</div>` : ""}
        </div>
      `);

      marker.on("click", () => {
        onSelect?.(p.id);
        marker.openPopup();
      });

      markersRef.current.push(marker);
    });

    // 選択中があるなら、見失わないように少し寄せる（任意）
    if (selectedId) {
      const hit = points.find((p) => String(p.id) === String(selectedId));
      if (hit) {
        try {
          map.panTo([hit.lat, hit.lng], { animate: true });
        } catch {}
      }
    }
  }, [points, selectedId, onSelect]);

  return (
    <View style={{ width: "100%", height: 420, borderRadius: 16, overflow: "hidden" }}>
      <div ref={divRef} style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

// XSS対策（popupにユーザー入力が混じる可能性あるので一応）
function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}