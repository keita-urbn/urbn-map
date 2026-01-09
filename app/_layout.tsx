// app/shop/_layout.tsx
import { Stack } from "expo-router";

export default function ShopLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: "Shop" }} />
    </Stack>
  );
}
