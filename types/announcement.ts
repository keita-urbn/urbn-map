export const ANNOUNCEMENT_CATEGORIES = [
  "NEW_SHOP",
  "EVENT",
  "RESTOCK",
  "UPDATE",
  "OTHER",
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  NEW_SHOP: "新店舗",
  EVENT: "イベント",
  RESTOCK: "入荷・再入荷",
  UPDATE: "アップデート",
  OTHER: "その他",
};

export type Announcement = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  description: string;
  publishedAt: number;
  createdAt: number;
  createdBy: string;
};
