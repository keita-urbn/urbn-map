import { useLocalSearchParams } from "expo-router";
import ShopDetailContent from "../../components/ShopDetailContent";

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShopDetailContent key={String(id ?? "")} shopId={String(id ?? "")} />;
}
