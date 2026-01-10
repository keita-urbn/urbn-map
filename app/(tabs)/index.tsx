// app/(tabs)/index.native.tsx
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";

import { useShops } from "../../hooks/useShops";
import { openGoogleMapsDirections } from "../../lib/openMaps";
import type { ShopDoc } from "../../types/shop";

const TOKYO: Region = {
  latitude: 35.681236,
  longitude: 139.767125,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const { shops, loading } = useShops();

  const [text, setText] = useState("");
  const [selected, setSelected] = useState<ShopDoc | null>(null);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return shops;

    return shops.filter((s) => {
      const hay = [
        s.name,
        s.area,
        s.genre,
        s.address,
        s.brands,
        s.instagram,
        s.comment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [shops, text]);

  const countLabel = useMemo(() => {
    if (text.trim()) return `検索中：${filtered.length}件`;
    return `全件表示：${filtered.length}件`;
  }, [filtered.length, text]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={TOKYO}
        onPress={() => setSelected(null)}
      >
        {filtered.map((s) => {
          const lat = Number(s.lat);
          const lng = Number(s.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          return (
            <Marker
              key={String(s.id)}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => setSelected(s)}
            >
              <Callout tooltip onPress={() => router.push(`/shop/${s.id}` as any)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{s.name}</Text>

                  <TouchableOpacity
                    onPress={() => router.push(`/shop/${s.id}` as any)}
                    style={styles.calloutLink}
                  >
                    <Text style={styles.calloutLinkText}>▶ 詳細を見る</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      openGoogleMapsDirections({ lat, lng }, s.name, "walking")
                    }
                    style={styles.calloutNav}
                  >
                    <Text style={styles.calloutNavText}>経路案内</Text>
                  </TouchableOpacity>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* 検索バー */}
      <View style={styles.searchWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="渋谷 / 中目黒 / ブランド古着 ... で絞り込み"
          placeholderTextColor="#9CA3AF"
          style={styles.search}
        />
        {text.length > 0 && (
          <TouchableOpacity onPress={() => setText("")} style={styles.clearBtn}>
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 件数ラベル */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{loading ? "Loading..." : countLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchWrap: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  search: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  clearBtn: {
    marginLeft: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { fontSize: 18, fontWeight: "800" },

  badge: {
    position: "absolute",
    top: 62,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  badgeText: { fontWeight: "700" },

  callout: {
    width: 220,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  calloutTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  calloutLink: { paddingVertical: 6 },
  calloutLinkText: { color: "#1d4ed8", fontWeight: "800" },

  calloutNav: {
    marginTop: 8,
    backgroundColor: "black",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  calloutNavText: { color: "white", fontWeight: "900" },
});