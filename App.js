import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function App() {
  const [location, setLocation] = useState(null);
  const mapRef = useRef(null);

  // 店舗（東京周辺）
  const shops = useMemo(
    () => [
      { id: 1, name: "サンローラン表参道", latitude: 35.665498, longitude: 139.712672 },
      { id: 2, name: "バレンシアガ銀座", latitude: 35.671479, longitude: 139.76523 },
      { id: 3, name: "ロエベ新宿伊勢丹", latitude: 35.692083, longitude: 139.703356 },
    ],
    []
  );

  // 位置許可 & 現在地
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("❌ 位置情報の許可がありません");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      console.log("📍 現在地:", loc.coords);
    })();
  }, []);

  // ★重要：全ピンを必ず画面に入れる
  useEffect(() => {
    if (!mapRef.current) return;

    const coords = [
      // 店舗
      ...shops.map(s => ({ latitude: s.latitude, longitude: s.longitude })),
      // 現在地（取得済みなら）
      ...(location ? [{ latitude: location.latitude, longitude: location.longitude }] : []),
      // テスト用中央ピン
      { latitude: 36.0, longitude: 138.0 },
    ];

    console.log("🧮 fit対象座標数:", coords.length);
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
      animated: true,
    });
  }, [location, shops]);

  // ループが走っているか可視化
  console.log("🛍️ shops.length =", shops.length);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: 36.0, longitude: 138.0, latitudeDelta: 8, longitudeDelta: 8 }}
        showsUserLocation={true}
        onMapReady={() => console.log("🗺️ Map ready")}
      >
        {/* 店舗ピン（ログ付き） */}
        {shops.map((shop) => {
          console.log("📌 render shop:", shop.name, shop.latitude, shop.longitude);
          return (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
              title={shop.name}
              description="店舗"
              pinColor="red"
              tracksViewChanges={false}
            />
          );
        })}

        {/* 現在地ピン（青） */}
        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="現在地"
            pinColor="blue"
          />
        )}

        {/* テスト用：日本中央の紫ピン（これが見えたらMarker描画は正常） */}
        <Marker
          coordinate={{ latitude: 36.0, longitude: 138.0 }}
          title="テスト用中央ピン"
          pinColor="purple"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});
