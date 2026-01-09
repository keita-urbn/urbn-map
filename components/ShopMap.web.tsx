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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const heightRef = useRef<number>(0);

  const points = useMemo(() => {
    return (shops ?? [])
      .map((s: any) => [Number(s.lat), Number(s.lng)] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  }, [shops]);

  // ✅ Webだけ：このコンポーネントの「画面内の位置(top)」を測って、
  // そこから下を "ピッタリ" 埋める（indexを触らない）
  useEffect(() => {
    const calc = () => {
      const el = wrapperRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      // 画面下まで。微調整はここ（0〜8くらい）
      const h = Math.max(240, Math.floor(window.innerHeight - rect.top));
      if (heightRef.current !== h) {
        heightRef.current = h;
        el.style.height = `${h}px`;
        // Leafletに「サイズ変わったぞ」を通知（これが超重要）
        const map = mapRef.current;
        if (map) {
          setTimeout(() => {
            try {
              map.invalidateSize();
            } catch {}
          }, 0);
        }
      }
    };

    calc();
    window.addEventListener("resize", calc);

    // フォント/レイアウト確定後にも再計算（ズレ防止）
    const t1 = window.setTimeout(calc, 80);
    const t2 = window.setTimeout(calc, 250);

    return () => {
      window.removeEventListener("resize", calc);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // 地図初期化（1回だけ）
  useEffect(() => {
    if (!mapDivRef.current) return;
    if (mapRef.current) return;

    mapDivRef.current.innerHTML = "";

    const map = L.map(mapDivRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;

    if (points.length) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [24, 24] });
    } else {
      map.setView([35.658034, 139.701636], 12);
    }

    // 初回ズレ対策
    const t = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 120);

    return () => {
      window.clearTimeout(t);
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

      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:800;margin-bottom:6px">${name}</div>
          ${area ? `<div style="opacity:.75">${area}</div>` : ""}
          ${address ? `<div style="opacity:.75;margin-top:4px">${address}</div>` : ""}
        </div>
      `);

      marker.on("click", () => onSelect?.(s.id));
      markersRef.current.push(marker);
    });

    // マーカー後もズレ修正
    const t = window.setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 60);

    return () => window.clearTimeout(t);
  }, [shops, selectedId, onSelect]);

  // ✅ 余白ゼロ：wrapperが「画面下まで」を自動で確保する
  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        // 高さはuseEffectでstyle.heightを直書きする（index不要）
        minHeight: 240,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}