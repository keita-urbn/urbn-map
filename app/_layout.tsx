// app/_layout.tsx
import { Stack } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import BrandedStartupSplash from "../components/BrandedStartupSplash";
import { AnnouncementsProvider } from "../context/announcements";
import { AuthProvider } from "../context/auth";
import { ThemeProvider, useTheme } from "../theme";

if (Platform.OS !== "web") {
  void SplashScreen.preventAutoHideAsync().catch(() => {});
}

function InnerLayout() {
  const { colors } = useTheme();

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="shop" options={{ headerShown: false }} />
      <Stack.Screen name="info" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{
          title: "お知らせ",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 18, fontWeight: "900" },
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: "ログイン",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 18, fontWeight: "900" },
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: "新規アカウント作成",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 18, fontWeight: "900" },
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="premium"
        options={{
          title: "Premium",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 18, fontWeight: "900" },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AnnouncementsProvider>
          <View style={styles.root}>
            <InnerLayout />
            <BrandedStartupSplash />
          </View>
        </AnnouncementsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
});
