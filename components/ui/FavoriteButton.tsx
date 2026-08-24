import { useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text } from "react-native";

import { useReducedMotion } from "../../hooks/useReducedMotion";

export type FavoriteToggleResult = {
  ok: boolean;
  reason?: "limit_reached" | "not_logged_in";
};

type Props = {
  saved: boolean;
  onToggle: () => Promise<FavoriteToggleResult | undefined>;
  onLimitReached?: () => void;
};

export function FavoriteButton({ saved, onToggle, onLimitReached }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0.62)).current;
  const [busy, setBusy] = useState(false);

  const settle = () => {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const playSuccess = () => {
    if (reduceMotion) {
      scale.setValue(1);
      burstOpacity.setValue(0);
      return;
    }

    burstOpacity.setValue(0.95);
    burstScale.setValue(0.62);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.36,
          duration: 145,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(burstScale, {
          toValue: 1.42,
          duration: 390,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: 390,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handlePress = async () => {
    if (busy) return;
    const wasSaved = saved;
    setBusy(true);
    try {
      const result = await onToggle();
      if (result?.reason === "limit_reached") onLimitReached?.();
      if (result?.ok && !wasSaved) playSuccess();
      else settle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      onPressIn={() => {
        if (!reduceMotion) {
          Animated.timing(scale, { toValue: 0.87, duration: 80, useNativeDriver: true }).start();
        }
      }}
      onPressOut={() => {
        if (!busy) settle();
      }}
      disabled={busy}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={saved ? "お気に入りから削除" : "お気に入りに追加"}
      accessibilityState={{ selected: saved, disabled: busy }}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.burst, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]}
      >
        <Animated.View style={styles.ring} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => (
          <Animated.View key={degrees} style={[styles.rayAxis, { transform: [{ rotate: `${degrees}deg` }] }]}>
            <Animated.View style={styles.ray} />
          </Animated.View>
        ))}
      </Animated.View>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text style={styles.heart}>{saved ? "❤️" : "🤍"}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  heart: { fontSize: 22 },
  burst: {
    position: "absolute",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: { position: "absolute", width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#ef4444" },
  rayAxis: { position: "absolute", width: 32, height: 32, alignItems: "center" },
  ray: { position: "absolute", top: -7, width: 2.5, height: 8, borderRadius: 2, backgroundColor: "#fb7185" },
});
