// app/favorites/_layout.tsx
import { Stack, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";

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

export default function FavoritesLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerLeft: () => <HeaderBack />,
        headerTitleStyle: { fontSize: 18, fontWeight: "900" },
      }}
    >
      <Stack.Screen name="list" options={{ title: "お気に入り一覧" }} />
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
