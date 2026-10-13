import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { useTheme } from "../theme";

// The original supplied photograph, bundled locally and fixed beneath screen content.
// Light mode retains its existing readable palette.
export default function MetallicBackground(_props: { subtle?: boolean } = {}) {
  const { isDark } = useTheme();
  if (!isDark) return null;
  return <Image source={require("../assets/textures/black-metal.jpg")} style={StyleSheet.absoluteFill}
    contentFit="cover" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
