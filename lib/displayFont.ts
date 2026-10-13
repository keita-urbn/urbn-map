export const DISPLAY_FONT = 'URBnAnton';

// Whole-label fallback is deliberate: native fallback for a Latin-only custom
// font is inconsistent across platforms. Japanese, emoji and unsupported
// scripts retain the system font, including their Latin characters.
// This allowlist was verified against the bundled Anton font's Unicode cmap.
export function canUseDisplayFont(text: string): boolean {
  return !!text.trim() && /^[\x20-\x7e\n\r\t\u2018\u2019\u201c\u201d]+$/.test(text);
}
