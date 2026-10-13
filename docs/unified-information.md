# Unified information feed, ranking icons and startup layout

## Information architecture

`lib/infoArticles.ts` defines the four original categories and maps documents from `info_shop`, `info_event`, `info_size`, `info_trend`, plus legacy `posts`. `hooks/useInfoArticles.ts` subscribes once per source; category/search changes filter locally without reconnecting listeners or navigating. Composite source/ID keys preserve equal IDs in different collections. Publication time uses existing `publishedAt` when present, otherwise `createdAt`; newest first. Existing unpublished/future metadata is respected. Failed source reads show an error while successfully read sources remain accessible; no fabricated demo articles replace production errors.

`components/InformationFeed.tsx` replaces the four cards on `app/(tabs)/explore.tsx`: All/category tabs, title/tag/abstract search, compact article previews and a virtualized list with safe-area/floating-nav padding. Body is never rendered in previews. Old `app/info/[type].tsx` links remain category-filtered feed entry points.

`app/info/article.tsx` provides dedicated source/ID article details with the exported **existing** `StructuredPostCard` from `components/InfoChatFeed.tsx`. Its complete Abstract, Body opacity/gradient mask, Premium CTA and `isPremium || isAdmin` access predicate are unchanged. Authenticated users go to Premium; logged-out users go through the existing login route. Admin deletion includes confirmation and error feedback.

`app/admin/add-post.tsx` now supplies the unified category-selecting publisher and editor, with the existing title/tags/abstract/body structure and admin-role gate. New documents go to the selected original `info_*` collection. Editing updates only those four content fields in the original collection; IDs, category, author, publication and creation timestamps remain unchanged. Category is read-only when editing to avoid moving an existing document. Reset and save feedback remain. Existing `posts` articles can still be read/edited/deleted. No documents were migrated or deleted, no new collection/required fields, no rule changes or production configuration changes. Live Firestore permissions must still be checked with authorized accounts.

## SAVED overlays

Only `RankingSection` in `app/(tabs)/favorites.tsx` changes: 40px shared `ShopIcon` within a contrasting circular border at image bottom-left. Original cover, placeholder, ranking badge, metrics, sorting and card action remain. Existing map-icon URL/path is used; no cover-as-logo fallback or new uploads.

## Native animation diagnosis

The installed RN 0.86 `Libraries/StyleSheet/StyleSheetExports.js` has `absoluteFill` but no `absoluteFillObject`. `BrandedStartupSplash.tsx` spread the absent API into both overlay and artwork styles. Spreading undefined yields no absolute-position properties: native Yoga therefore places the splash as a normal sibling of the navigation stack and its image in normal flow. This explains the map/logo vertical split in the supplied screenshot. React Native Web still provided the old property, explaining working web layout.

Fix: explicit absolute position and zero top/right/bottom/left on both styles. Original viewport calculations, reveal windows, timing, scale and fade stay intact. Animated values use stable state initializers rather than render-time ref reads, resolving related compiler lint errors. No animation library or logo resize added. Full-screen overlay blocks touches during startup, then unmounts on animation completion as before.

## Verification and limitations

18 Node tests pass, covering legacy feed merge, category/tag search, date order, published visibility, original Abstract/Body masking and native absolute overlay without the removed API. Targeted changed-code lint passes except the unchanged existing Favorites render-time seed-ref lint issue. Full project checks retain 5 TypeScript errors and 32 lint issues. iOS/Android/web exports pass.

No connected iOS runtime/browser session exists. Still verify Expo Go cold launch, reveal/fade, orientation, safe-area and touch recovery; production iOS startup; category scrolling/search and bottom nav; all legacy sources; admin publishing/edit/delete; logged-out/free/Premium/admin detail visibility; Storage image overlays on light/dark photos. Export/tests establish code behavior and bundling, not live Firebase authorization or native animation smoothness.

Modified/new files: `app/(tabs)/explore.tsx`, `app/(tabs)/favorites.tsx`, `app/info/[type].tsx`, `app/info/article.tsx`, `app/admin/add-post.tsx`, `components/InformationFeed.tsx`, `components/InfoChatFeed.tsx`, `components/BrandedStartupSplash.tsx`, `hooks/useInfoArticles.ts`, `lib/infoArticles.ts`, `tests/info-feed.test.cjs`, `tests/feed-ui.test.cjs`, this document.
