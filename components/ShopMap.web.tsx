// components/ShopMap.web.tsx
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import type { ShopDoc } from "../types/shop";

// ✅ CSSは「Webでだけ」読み込む（これが無いと地図が透明/崩れる）
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("leaflet/dist/leaflet.css");
}

type Props = {
  shops: ShopDoc[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export default function ShopMapWeb({ shops, selectedId, onSelect }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);

  // Leafletのmapインスタンス、marker一覧を保持
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // 座標があるやつだけに絞る
  const points = useMemo(() => {
    return (shops ?? [])
      .map((s) => ({
        id: (s as any).id ?? (s as any).docId ?? (s as any).name,
        name: (s as any).name ?? "Shop",
        lat: Number((s as any).lat),
        lng: Number((s as any).lng),
        area: (s as any).area,
        address: (s as any).address,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }, [shops]);

  // 初期化（1回だけ）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!divRef.current) return;
    if (mapRef.current) return; // 二重生成防止

    let disposed = false;

    (async () => {
      const L = await import("leaflet");

      if (disposed) return;
      if (!divRef.current) return;

      // ✅ 重要：既存の中身があれば消してから作る
      divRef.current.innerHTML = "";

      const map = L.map(divRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      mapRef.current = map;

      // ✅ タイル（OpenStreetMap）
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // 初期表示（点があればfit、なければ渋谷）
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [24, 24] });
      } else {
        map.setView([35.658034, 139.701636], 12); // 渋谷
      }
    })();

    return () => {
      disposed = true;
      try {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // マーカー再生成（shops変更）
  useEffect(() => {
    if (!mapRef.current) return;

    (async () => {
      const L = await import("leaflet");
      const map = mapRef.current;

      // 既存マーカー削除
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      // 追加
      for (const p of points) {
        const marker = L.marker([p.lat, p.lng]).addTo(map);

        const html = `
          <div style="min-width:160px">
            <div style="font-weight:700;margin-bottom:6px">${escapeHtml(p.name)}</div>
            ${p.area ? `<div style="opacity:.8">📍 ${escapeHtml(p.area)}</div>` : ""}
            ${p.address ? `<div style="opacity:.8">🏠 ${escapeHtml(p.address)}</div>` : ""}
          </div>
        `;
        marker.bindPopup(html);

        marker.on("click", () => onSelect?.(String(p.id)));
        markersRef.current.set(String(p.id), marker);
      }

      // 点があるなら見える範囲に合わせる（地図が真っ白対策にも効く）
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [24, 24] });
      }
    })();
  }, [points, onSelect]);

  // selectedIdが変わったらそこへ寄せる
  useEffect(() => {
    if (!mapRef.current) return;
    if (!selectedId) return;

    const marker = markersRef.current.get(String(selectedId));
    if (!marker) return;

    try {
      mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom?.() ?? 13, 14));
      marker.openPopup?.();
    } catch {}
  }, [selectedId]);

  return (
    <View style={{ width: "100%", height: 420, borderRadius: 16, overflow: "hidden" }}>
      <div ref={divRef} style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

// HTMLエスケープ（Popupの安全対策）
function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
