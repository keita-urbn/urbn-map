// app/info/_layout.tsx
import { Stack, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";

const CATEGORY_CONFIG = {
  shop:  { title: "店舗情報" },
  event: { title: "イベント情報" },
  size:  { title: "サイズ詳細" },
  trend: { title: "トレンド情報" },
} as const;

function HeaderBack() {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <View
        style={[
          styles.backWrap,
          { backgroundColor: colors.pill, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
      </View>
    </Pressable>
  );
}

// Dynamically render with title from route params
export default function InfoLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: 18, fontWeight: "900" },
        contentStyle: { backgroundColor: colors.background },
        headerLeft: () => <HeaderBack />,
      }}
    >
      <Stack.Screen
        name="[type]"
        options={({ route }) => {
          const categoryKey = ((route.params as any)?.type ?? "shop") as string;
          const title = CATEGORY_CONFIG[categoryKey as keyof typeof CATEGORY_CONFIG]?.title ?? "情報";
          return { title };
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backWrap: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginLeft: 8,
  },
  backText: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
    marginLeft: -1,
    marginTop: -1,
  },
});
