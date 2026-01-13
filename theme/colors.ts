// theme/colors.ts

export type ThemeColors = {
  // ✅互換用（古いコードが colors.bg を参照してても落ちない）
  bg: string;

  background: string; // 画面全体
  surface: string;    // 検索バー・カードの土台
  card: string;       // カード（surfaceより少し強調）
  text: string;       // メイン文字
  muted: string;      // 補助文字
  border: string;     // 枠線
  pill: string;       // 小さな丸ボタン（×など）
  accent: string;     // 強調色
};

export const lightColors: ThemeColors = {
  bg: "#ffffff",
  background: "#ffffff",
  surface: "#ffffff",
  card: "#ffffff",
  text: "#111111",
  muted: "#6b7280",
  border: "#e5e7eb",
  pill: "#d1d5db",     // ←少し濃く（ネイティブ感）
  accent: "#111111",
};

export const darkColors: ThemeColors = {
  bg: "#0f0f10",
  background: "#0f0f10",
  surface: "#161618",
  card: "#1b1b1e",
  text: "#f5f5f5",
  muted: "#a1a1aa",
  border: "#2a2a2e",
  pill: "#3a3a40",     // ←少し濃く
  accent: "#f5f5f5",
};
