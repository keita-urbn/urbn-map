// components/ShopMap.web.tsx
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import type { ShopDoc } from "../types/shop"; // ←あなたの型パスに合わせて

type Props = {
  shops: ShopDoc[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

function iconHtml() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">
    <defs>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
      <path d="M23 44c6-9 14-18 14-27a14 14 0 1 0-28 0c0 9 8 18 14 27z"
            fill="white" stroke="black" stroke-width="3"/>
      <circle cx="23" cy="17" r="6.5" fill="black"/>
    </g>
  </svg>`;
}

export default function ShopMapWeb({ shops, selectedId, onSelect }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const points = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => [Number(s.lat), Number(s.lng)] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  }, [shops]);

  // 地図初期化（1回だけ）
  useEffect(() => {
    if (!divRef.current) return;
    if (mapRef.current) return;

    divRef.current.innerHTML = "";

    const map = L.map(divRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;

    // 初期表示
    if (points.length) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [24, 24] });
    } else {
      map.setView([35.658034, 139.701636], 12);
    }

    // レイアウト確定後のズレ対策
    const t = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 200);

    const onResize = () => {
      try {
        map.invalidateSize();
      } catch {}
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // マーカー更新
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {}
    });
    markersRef.current = [];

    const icon = L.divIcon({
      className: "urbn-pin",
      html: iconHtml(),
      iconSize: [46, 46],
      iconAnchor: [23, 44],
      popupAnchor: [0, -42],
    });

    (shops ?? []).forEach((s: any) => {
      const lat = Number(s.lat);
      const lng = Number(s.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      const name = s?.name ?? "Shop";
      const area = s?.area ? `📍 ${s.area}` : "";
      const address = s?.address ? `🏠 ${s.address}` : "";

      const popupHtml = `
        <div style="min-width:180px">
          <div style="font-weight:800;margin-bottom:6px">${name}</div>
          ${area ? `<div style="opacity:.75">${area}</div>` : ""}
          ${address ? `<div style="opacity:.75;margin-top:4px">${address}</div>` : ""}
          ${selectedId === s.id ? `<div style="margin-top:8px;font-size:12px;opacity:.7">選択中</div>` : ""}
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on("click", () => onSelect?.(s.id));

      markersRef.current.push(marker);
    });

    const t = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 120);

    return () => window.clearTimeout(t);
  }, [shops, selectedId, onSelect]);

  // ✅ ここが重要：親のレイアウトに従う（100vh禁止）
  // 親側で <View style={{ flex: 1 }}> 相当になってる前提で “100%” にする
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div ref={divRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}