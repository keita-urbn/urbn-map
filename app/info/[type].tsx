// app/info/[type].tsx
import { useLocalSearchParams } from "expo-router";
import InfoChatFeed from "../../components/InfoChatFeed";
import { useAuth } from "../../context/auth";

const CATEGORY_CONFIG = {
  shop:  { title: "店舗情報",   collectionName: "info_shop" },
  event: { title: "イベント情報", collectionName: "info_event" },
  size:  { title: "サイズ詳細",  collectionName: "info_size" },
  trend: { title: "トレンド情報", collectionName: "info_trend" },
} as const;

export default function InfoCategoryScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { isAdmin, isPremium } = useAuth();
  const config = CATEGORY_CONFIG[type as keyof typeof CATEGORY_CONFIG];

  if (!config) {
    return null;
  }

  return (
    <InfoChatFeed
      collectionName={config.collectionName}
      isAdmin={isAdmin}
      isPremium={isPremium || isAdmin}
    />
  );
}
