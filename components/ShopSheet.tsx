import ShopIcon from "./ShopIcon";
import DisplayText from "./ui/DisplayText";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, BackHandler, Keyboard, KeyboardAvoidingView, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, ScrollView, type PanResponderCallbacks } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTheme } from "../theme";
import type { ShopDoc } from "../types/shop";
import MetallicBackground from "./MetallicBackground";
import ShopDetailContent from "./ShopDetailContent";
import { FavoriteButton, type FavoriteToggleResult } from "./ui/FavoriteButton";

type Props = { relatedCandidates?: ShopDoc[]; onSelectRelated?: (shop: ShopDoc) => void; shop: ShopDoc; onClose: () => void; onDirections: () => void; saved: boolean; onToggle: () => Promise<FavoriteToggleResult | undefined> };
export default function ShopSheet({ shop, relatedCandidates, onSelectRelated, onClose, onDirections, saved, onToggle }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const expandedHeight = Math.max(240, height - insets.top - 76);
  const [previewHeight, setPreviewHeight] = useState(174);
  const collapsedHeight = Math.min(expandedHeight, 42 + 28 + previewHeight + insets.bottom);
  const collapsedOffset = expandedHeight - collapsedHeight;
  const [translate] = useState(() => new Animated.Value(expandedHeight));
  const [expanded, setExpanded] = useState(false);
  const dragStart = useRef(collapsedOffset);
  const scrollOffset = useRef(0);
  const detailScroll = useRef<ScrollView>(null);
  useEffect(() => { scrollOffset.current = 0; }, [shop.id]);
  const animateTo = useCallback((toValue: number, complete?: () => void) => {
    if (reducedMotion) { translate.setValue(toValue); complete?.(); return; }
    Animated.spring(translate, { toValue, useNativeDriver: Platform.OS !== "web", damping: 26, stiffness: 230, mass: 1 })
      .start(({ finished }) => { if (finished) complete?.(); });
  }, [reducedMotion, translate]);
  const snap = useCallback((open: boolean) => {
    Keyboard.dismiss();
    if (!open) detailScroll.current?.scrollTo({ y: 0, animated: !reducedMotion });
    setExpanded(open);
    animateTo(open ? 0 : collapsedOffset);
  }, [animateTo, collapsedOffset, reducedMotion]);
  const dismiss = useCallback(() => { Keyboard.dismiss(); animateTo(expandedHeight, onClose); }, [animateTo, expandedHeight, onClose]);
  useEffect(() => { animateTo(expanded ? 0 : collapsedOffset); }, [animateTo, collapsedOffset, expanded]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { if (expanded) snap(false); else dismiss(); return true; });
    return () => listener.remove();
  }, [dismiss, expanded, snap]);

  // React Compiler flags ref captures in PanResponder.create, but these refs
  // are read only by callbacks after a touch begins, never during render.
  const pans = useMemo(() => {
    const dragHandlers: PanResponderCallbacks = {
      onPanResponderGrant: () => { Keyboard.dismiss(); translate.stopAnimation(value => { dragStart.current = value; }); },
      onPanResponderMove: (_, g) => translate.setValue(Math.max(0, Math.min(expandedHeight, dragStart.current + g.dy))),
      onPanResponderRelease: (_, g) => {
        if (!expanded && (g.dy > 75 || g.vy > 1)) { dismiss(); return; }
        if (g.dy < -40 || g.vy < -.5) snap(true);
        else if (g.dy > 40 || g.vy > .5) snap(false);
        else snap(expanded);
      },
      onPanResponderTerminate: () => snap(expanded),
    };
    return {
      // eslint-disable-next-line react-hooks/refs
      surface: PanResponder.create({ ...dragHandlers,
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx)
          && (!expanded || (g.dy > 0 && scrollOffset.current <= 1)),
      }),
      // The handle always drags, including when the detail list has scrolled down.
      // eslint-disable-next-line react-hooks/refs
      handle: PanResponder.create({ ...dragHandlers,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      }),
    };
  }, [dismiss, expanded, expandedHeight, snap, translate]);

  const preview = <View style={styles.preview} onLayout={event => {
    const measured = Math.ceil(event.nativeEvent.layout.height);
    setPreviewHeight(current => current === measured ? current : measured);
  }}>
    <View style={styles.titleRow}><ShopIcon url={shop.mapIconUrl} path={shop.mapIconPath} size={68} /><DisplayText numberOfLines={2} ellipsizeMode="tail" style={[styles.title, { color: colors.text }]}>{shop.name}</DisplayText><FavoriteButton saved={saved} onToggle={onToggle} /></View>
    <Text numberOfLines={1} style={{ color: colors.muted }}>{[shop.area, shop.genre].filter(Boolean).join(" · ")}</Text>
    <Text style={[styles.rating, { color: colors.text }]}>★ {(shop.ratingAverage ?? 0).toFixed(1)} <Text style={{ color: colors.muted }}>({shop.ratingCount ?? 0})</Text></Text>
    <Pressable onPress={onDirections} accessibilityRole="button" style={styles.action}><Ionicons name="navigate-outline" size={17} color="#fff" /><Text style={styles.actionText}>経路案内</Text></Pressable>
  </View>;

  return <Animated.View {...pans.surface.panHandlers} style={[styles.sheet, { height: expandedHeight, backgroundColor: colors.background, borderColor: colors.border, transform: [{ translateY: translate }] }]}>
    <MetallicBackground subtle />
    <View {...pans.handle.panHandlers} style={styles.dragZone}>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "店舗詳細を折りたたむ" : "店舗詳細を展開"} onPress={() => snap(!expanded)} style={styles.handleButton}>
        <View style={[styles.handle, { backgroundColor: colors.muted }]} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={dismiss} style={styles.close}><Ionicons name="close" size={23} color={colors.text} /></Pressable>
    </View>
    <KeyboardAvoidingView style={{ flex: 1, paddingBottom: insets.bottom }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ShopDetailContent key={shop.id} shopId={shop.id} relatedCandidates={relatedCandidates} onSelectRelated={onSelectRelated} header={preview} scrollRef={detailScroll} scrollEnabled={expanded} onScrollOffset={offset => { scrollOffset.current = offset; }} />
    </KeyboardAvoidingView>
  </Animated.View>;
}
const styles = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1200, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOpacity: .24, shadowRadius: 22, shadowOffset: { width: 0, height: -5 }, elevation: 18 },
  dragZone: { height: 42, alignItems: "center", justifyContent: "center" }, handleButton: { width: 100, height: 42, alignItems: "center", justifyContent: "center" }, handle: { width: 38, height: 4, borderRadius: 3 }, close: { position: "absolute", right: 14, padding: 8 },
  preview: { paddingHorizontal: 8, gap: 10, paddingBottom: 8 }, titleRow: { flexDirection: "row", alignItems: "center", gap: 12 }, title: { flex: 1, minWidth: 0, fontSize: 25, fontWeight: "900" }, rating: { fontSize: 14, fontWeight: "700" }, action: { minHeight: 46, borderRadius: 18, backgroundColor: "#ef4444", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }, actionText: { color: "#fff", fontWeight: "800" },
});
