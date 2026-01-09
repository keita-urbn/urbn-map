// app/admin/_layout.tsx
import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="add-shop" options={{ title: "店舗追加フォーム" }} />
      <Stack.Screen name="edit-shop/[id]" options={{ title: "店舗編集" }} />
    </Stack>
  );
}
