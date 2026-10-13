# Editorial display typography

Anton Regular is bundled locally as `assets/fonts/Anton-Regular.ttf`, with the upstream SIL Open Font License in `Anton-OFL.txt`. Source: https://github.com/google/fonts/tree/main/ofl/anton. Barlow Condensed ExtraBold was considered; Anton's denser strokes and narrower display proportions are a closer practical match to the supplied Squeeze reference. No proprietary Instagram font is used.

`TypographyProvider` uses the existing expo-font dependency and loads the asset once at the app root. The branded splash waits for the font to load or report an error. A failed font load retains readable system text and does not block splash dismissal.

`DisplayText` is opt-in. It preserves supplied font sizes, colors, accessibility font scaling and wrapping/truncation props, uses Anton's actual heavy regular face without simulated bold, and gives text sufficient line height. It does not squeeze or scale glyphs. Body copy, forms, search, hours, review text and small actions retain native Text.

The display policy allows ASCII and supported curly quotation marks; the bundled TTF cmap was inspected to verify these glyphs. Any Japanese, mixed-language, emoji or unsupported-character label uses the system font for the entire label, preventing unreliable native per-glyph fallback. Existing accents outside this conservative allowlist also use the system font. Shop names in compact carousels keep a two-line limit and tail truncation; large detail titles can wrap naturally. The Japanese labels in InfoCategoryCard retain system typography through the same guard.

Modified files:

- `assets/fonts/Anton-Regular.ttf`, `assets/fonts/Anton-OFL.txt`: font and license.
- `lib/displayFont.ts`, `theme/typography.tsx`, `components/ui/DisplayText.tsx`: reusable loading, coverage policy and display rendering.
- `app/_layout.tsx`, `components/BrandedStartupSplash.tsx`: app-root provider and startup readiness.
- `components/ShopSheet.tsx`, `components/ShopDetailContent.tsx`, `components/ui/ShopCard.tsx`, `components/RelatedShopsCarousel.tsx`, `app/(tabs)/favorites.tsx`: shop names.
- `components/AccountScreen.tsx`, `app/premium.tsx`, `components/ui/PostCard.tsx`, `components/InfoCategoryCard.tsx`: editorial headlines and prominent titles.

Validation includes bundled font cmap inspection, TypeScript/lint checks and web/iOS/Android production exports. Native font loading, accessibility font sizes and long/mixed-language text need visual checks on physical devices; bundling alone does not prove runtime rendering.
