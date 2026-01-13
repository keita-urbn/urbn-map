// theme/theme.ts
import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, ThemeColors } from "./colors";

type ThemeValue = {
  colors: ThemeColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeValue | null>(null);

// ✅ named export
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const value = useMemo<ThemeValue>(
    () => ({
      isDark,
      colors: isDark ? darkColors : lightColors,
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ✅ default export（どっちでimportしてもOK）
export default ThemeProvider;

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
