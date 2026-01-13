// app/_layout.tsx
import { Stack } from "expo-router";
import { ThemeProvider } from "../theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="shop" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}