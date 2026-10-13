# Shop editorial and conversational reviews

Optional Firestore shop strings: `theVibe`, `theSelection`, `theExperience`. The existing `comment` description is unchanged. Add/Edit forms support multiline Japanese/English, trim outer whitespace on save, and allow clearing optional sections. Shop mapping reads absent fields as empty strings. No migrations or security-rule changes.

`ShopEditorial` renders populated sections only, using display typography for headings and regular paragraph text. Legacy descriptions render under OVERVIEW when alone or ABOUT alongside editorial content; exact matching paragraphs are suppressed to avoid duplication. Essential address/brands/Instagram information is compact; category/area remain in the identity preview, with business hours, images, routes, favorites and related shops retained.

`ReviewMessage` supplies avatar fallback, author, formatted date, rating and message text; `ReviewComposer` is a native modal outside the sheet responder tree, with keyboard avoidance and its own scrolling. Existing `useReviews`, `addReview`, transactional aggregate updates and own-review deletion remain in use. Posting reloads reviews and shop ratings immediately. No social placeholder controls or new backend exists.

Current review documents do not normally contain display names/photos. The reader now preserves optional existing `displayName`/`photoURL` metadata; otherwise own reviews can use current Firebase Auth identity and others use a neutral fallback. No per-author Firestore profile reads were added, and submission payloads were not expanded (avoids requiring review-rule schema changes).

Files: `types/shop.ts`, `hooks/useShops.ts`, `app/admin/add-shop.tsx`, `app/admin/edit-shop/[id].tsx`, `components/ShopDetailContent.tsx`, new `ShopEditorial.tsx`, `ShopEditorialEditor.tsx`, `ReviewMessage.tsx`, `ReviewComposer.tsx`, `types/review.ts`, `lib/reviews.ts`, `tests/editorial.test.cjs`.

Validation: editorial empty/legacy/partial/full and duplicate cases are covered by automated tests. New components pass targeted lint. Existing full-project TypeScript/lint failures remain. All-platform exports validate bundling, not physical-device behavior.

Manual QA still required: authenticated Add/Edit persistence and blank-field clearing; existing/new/duplicate reviews; logged-out login prompt; successful and denied Firestore writes; owner deletion; long Japanese/English text; keyboard with composer; map-sheet dragging/scrolling, favorites, route restrictions and related carousel on iOS/Android. Reviews retain the existing single scroll-container architecture, avoiding nested vertical lists; pagination/virtualization for very large review histories remains a future improvement.
