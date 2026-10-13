import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import { STATUS_ACCENTS, type OpeningStatus } from '../lib/businessHours';
import { placeMarkers, rankMarkers, PRIORITY_COLORS, type Priority } from '../lib/markerPriority';
import type { ShopDoc } from '../types/shop';
type Props = { priorityShops?: ShopDoc[]; shops: ShopDoc[]; statusById: Record<string, OpeningStatus>; initialRegion: Region; selected: ShopDoc | null; onSelect: (shop: ShopDoc | null) => void };
export default function ShopMap({ shops, priorityShops = shops, statusById, initialRegion, selected, onSelect }: Props) {
  const ref = useRef<MapView>(null);
  const [region, setRegion] = useState(initialRegion);
  const [size, setSize] = useState({ width: 390, height: 800 });
  const priorities = useMemo(() => rankMarkers(priorityShops), [priorityShops]);
  const markers = useMemo(() => {
    const latY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360));
    const top = latY(region.latitude + region.latitudeDelta / 2);
    const bottom = latY(region.latitude - region.latitudeDelta / 2);
    return placeMarkers(shops.filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng)).map(shop => ({ shop, x: ((shop.lng - region.longitude) / region.longitudeDelta + .5) * size.width, y: (top - latY(shop.lat)) / (top - bottom) * size.height })).filter(p => p.shop.id === selected?.id || p.x >= -80 && p.x <= size.width + 80 && p.y >= -80 && p.y <= size.height + 80), priorities, Math.log2(360 / region.longitudeDelta), selected?.id);
  }, [shops, region, size, priorities, selected?.id]);
  const regionRef = useRef(region);
  useEffect(() => { regionRef.current = region; }, [region]);
  useEffect(() => {
    if (selected && Number.isFinite(selected.lat) && Number.isFinite(selected.lng)) ref.current?.animateToRegion({ ...regionRef.current, latitude: selected.lat - regionRef.current.latitudeDelta * .18, longitude: selected.lng }, 300);
  }, [selected]);
  return <View style={{ flex: 1 }} onLayout={e => setSize(e.nativeEvent.layout)}><MapView ref={ref} style={StyleSheet.absoluteFill} initialRegion={initialRegion}
    onRegionChangeComplete={setRegion} onPress={(event: MapPressEvent) => { if (event.nativeEvent.action !== 'marker-press') onSelect(null); }}>
    {markers.map(({ shop, label }) => <ShopMarker key={`${shop.id}:${shop.mapIconUrl}:${statusById[shop.id]}:${selected?.id === shop.id}:${priorities[shop.id].tier}:${label}`} shop={shop} priority={priorities[shop.id]} label={label} status={statusById[shop.id] ?? 'unknown'} selected={selected?.id === shop.id} onSelect={onSelect} />)}
  </MapView></View>;
}
function ShopMarker({ shop, priority, label, status, selected, onSelect }: { shop: ShopDoc; priority: Priority; label: boolean; status: OpeningStatus; selected: boolean; onSelect: (shop: ShopDoc) => void }) {
  const marker = useRef<React.ComponentRef<typeof Marker>>(null);
  const [tracking, setTracking] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setTracking(false), 1000); return () => clearTimeout(timer); }, []);
  return <Marker ref={marker} coordinate={{ latitude: shop.lat, longitude: shop.lng }} anchor={{ x: label ? 24 / 180 : .5, y: .5 }} tracksViewChanges={tracking} zIndex={selected ? 1000 : Math.round(priority.score * 100)} onPress={e => { e.stopPropagation(); onSelect(shop); }} accessibilityLabel={`${shop.name}, ${status}`}>
    <View style={{ width: label ? 180 : 48, height: 52, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${PRIORITY_COLORS[priority.tier]}66`, padding: 5, borderWidth: selected ? 2 : 0, borderColor: '#ef4444' }}>
        {shop.mapIconUrl && !failed ? <Image source={{ uri: shop.mapIconUrl }} cachePolicy="memory-disk" style={{ flex: 1, borderRadius: 20 }} onLoad={() => marker.current?.redraw()} onError={() => { setFailed(true); setTimeout(() => marker.current?.redraw(), 50); }} /> : <View style={{ flex: 1, borderRadius: 20, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="storefront-outline" size={22} color="#333" /></View>}
        <View style={{ position: 'absolute', right: 1, bottom: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_ACCENTS[status], borderColor: '#fff', borderWidth: 1.5 }} />
      </View>
      {label && <Text numberOfLines={2} style={{ width: 126, marginLeft: 4, fontSize: 12, fontWeight: '700', color: '#fff', textShadowColor: '#000', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } }}>{shop.name}</Text>}
    </View>
  </Marker>;
}
