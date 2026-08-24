import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { useAuth } from "../context/auth";
import { useReducedMotion } from "../hooks/useReducedMotion";

const WORDMARK = require("../assets/images/urbn-wordmark.jpg");
const IMAGE_ASPECT_RATIO = 1722 / 2360;
const LETTER_STARTS = [300, 850, 1400, 1950];
const LETTER_DURATION = 650;
const FULL_LOGO_HOLD = 1200;
const EXIT_DURATION = 820;

// Horizontal windows measured from the supplied 1722 × 2360 artwork.
// Slight overlap prevents antialiased edge pixels from appearing early.
const LETTER_WINDOWS = [
  { left: "19.5%", width: "16.3%" }, // U
  { left: "34.8%", width: "15.4%" }, // R
  { left: "49.2%", width: "15.5%" }, // B
  { left: "63.7%", width: "15.5%" }, // N
] as const;

let startupClaimed = false;

export default function BrandedStartupSplash() {
  const { loading } = useAuth();
  const reduceMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(() => {
    if (startupClaimed) return false;
    startupClaimed = true;
    return true;
  });
  const [brandFinished, setBrandFinished] = useState(false);
  const exitProgress = useRef(new Animated.Value(0)).current;
  const fadeStarted = useRef(false);
  const fadeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const reveals = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const imageWidth = Math.min(windowWidth * 0.94, windowHeight * 0.84 * IMAGE_ASPECT_RATIO, 720);
  const imageHeight = imageWidth / IMAGE_ASPECT_RATIO;

  useEffect(() => {
    if (!visible) return;

    if (reduceMotion) {
      reveals.forEach((reveal) => reveal.setValue(1));
      const timer = setTimeout(() => setBrandFinished(true), 1000);
      return () => clearTimeout(timer);
    }

    const revealAnimations = reveals.map((reveal, index) =>
      Animated.timing(reveal, {
        toValue: 1,
        duration: LETTER_DURATION,
        delay: LETTER_STARTS[index],
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    );
    const sequence = Animated.sequence([
      Animated.parallel(revealAnimations),
      Animated.delay(FULL_LOGO_HOLD),
    ]);
    sequence.start(({ finished }) => {
      if (finished) setBrandFinished(true);
    });
    return () => sequence.stop();
  }, [reduceMotion, reveals, visible]);

  useEffect(() => {
    if (!visible || loading || !brandFinished || fadeStarted.current) return;
    fadeStarted.current = true;
    const fade = Animated.timing(exitProgress, {
      toValue: 1,
      duration: EXIT_DURATION,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    });
    fadeAnimation.current = fade;
    fade.start(({ finished }) => {
      if (finished) {
        // Leave the fully transparent overlay rendered for one paint before
        // unmounting it, so the already-rendered app is the visible underlay.
        requestAnimationFrame(() => setVisible(false));
      }
    });
  }, [brandFinished, exitProgress, loading, visible]);

  useEffect(() => {
    return () => fadeAnimation.current?.stop();
  }, []);

  if (!visible) return null;

  const overlayOpacity = exitProgress.interpolate({
    inputRange: [0, 0.18, 0.8, 1],
    outputRange: [1, 1, 0.24, 0],
  });
  const logoOpacity = exitProgress.interpolate({
    inputRange: [0, 0.18, 0.82, 1],
    outputRange: [1, 0.98, 0.08, 0],
  });
  const logoScale = exitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.085],
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      onLayout={() => {
        if (Platform.OS !== "web") void SplashScreen.hideAsync().catch(() => {});
      }}
      accessibilityViewIsModal
      accessibilityLabel="URBNを起動中"
    >
      <Animated.View
        style={[
          styles.imageFrame,
          {
            width: imageWidth,
            height: imageHeight,
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
        accessibilityElementsHidden
      >
        <Image source={WORDMARK} style={styles.image} resizeMode="contain" />
        {LETTER_WINDOWS.map((window, index) => (
          <Animated.View
            key={window.left}
            pointerEvents="none"
            style={[
              styles.cover,
              window,
              {
                height: reveals[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: ["100%", "0%"],
                }),
              },
            ]}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFrame: { position: "relative", overflow: "hidden", backgroundColor: "#000" },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  cover: { position: "absolute", top: 0, backgroundColor: "#000" },
});
