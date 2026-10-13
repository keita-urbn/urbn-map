import { useSafeAreaInsets } from "react-native-safe-area-context";

export const FLOATING_TAB_HEIGHT = 52;
export const FLOATING_TAB_GAP = 12;

// Padding belongs to scroll content, allowing the background and list viewport
// to fill the screen while the final item can scroll above the floating pill.
export function useTabContentInsets() {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + 16,
    paddingBottom: Math.max(insets.bottom, FLOATING_TAB_GAP) + FLOATING_TAB_HEIGHT + 20,
    paddingLeft: insets.left + 18,
    paddingRight: insets.right + 18,
  };
}
