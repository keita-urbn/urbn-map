# Multiple shop, article and review photos

## Data and storage

Uses the existing Firebase bucket and existing Expo dependencies; no dependencies
or provider added. New public photo metadata: ordered arrays of
`{ id, storagePath, downloadURL, width, height, createdAt }`. Array position is
canonical ordering; createdAt is milliseconds. No Base64 is stored in Firestore.

- shops/{shopId}: optional galleryImages. New files:
  shops/{shopId}/gallery/{unique-version}.jpg.
- shops/{shopId}/reviews/{uid}: optional images. The existing review ID is uid,
  so files use reviews/{shopId}/{uid}/images/{unique-version}.jpg to avoid collisions
  across shops. Ratings, text, author uid and timestamp retain existing semantics.
- Articles continue using existing publicImages/publicGalleryImageIds and
  private/content premiumImages/bodyBlocks. Paths remain
  articles/{source}/{articleId}/{public|premium}/{unique-version}.jpg. Their
  authenticated Premium image reads and token-free metadata are unchanged.

Legacy shop imageUrl and images/imageUrls/photos arrays are read without migration.
Explicit galleryImages (including []) takes precedence so a removed legacy photo
cannot reappear. Legacy fields and objects are not erased. Legacy URLs with unknown
Storage ownership are not deleted. Explicit Premium entries are excluded from
public legacy readers; no shop Premium image schema existed in this checkout.
Legacy article imageUrl/imageUrls/photos/images are displayed as Public images only
where their legacy metadata does not mark them Premium. Existing structured inline
article blocks remain inline; unreferenced attachments form horizontal galleries.

## Save and cleanup behavior

PhotoManager stages selection locally, supports addition/removal/reordering and
count/error feedback. Limits: 10 shop photos, 10 total article images, 5 review
photos. Add Shop reserves a Firestore ID before upload. Existing unchanged photos
are never reuploaded. New files use distinct names, resize longest edge to <=1600px,
JPEG quality .85, actual input <=20MB and uploaded output <=5MB. JPEG/PNG/WebP
inputs are supported where platform decoding supports them; HEIC/HEIF errors are
reported where the platform cannot decode them. Expo's manipulator decodes the
source/orientation; no map-icon processing changed.

All new uploads complete before committing photo references. Failures clean only
new files. Existing photos are removed only after the Firestore update succeeds.
Post-commit cleanup failure is reported separately from save failure to avoid
encouraging duplicate resubmission. Review references and existing aggregate rating
updates commit in the same transaction; duplicate reviews roll back only their new
files. Review deletion commits first, then deletes its referenced, owned photos.
Cleanup failures require operator retry; no directory deletion or expiry policy.
Existing whole-shop deletion behavior is unchanged (it does not recursively purge
subcollections or Storage). Manually manage any retained photos after whole-shop
removal according to the project's retention policy.

## Distinct presentation components

ShopPhotoGallery/HorizontalPhotoGallery uses a virtualized horizontal list with
3:4 cover-cropped cards, 8px gaps and roughly 2.25 visible images. It hides empty
and failed galleries. ArticlePhotoGallery shares the layout with protected
ArticleMedia rendering; Premium content mounts only for entitled users.

ReviewStackedPhotoCarousel renders up to three overlapping portrait cards. A
horizontal PanResponder slides the active card left/right with a spring return;
index updates are bounded to one step. Busy transitions reject rapid repeats,
termination resets the transform, and events are never retained. Vertical gestures
are not claimed. Existing Animated is used for Expo Go compatibility and reduced
motion is respected. Accessible arrows also support web/keyboard users. Zero
photos render nothing; one has no stack offsets/counter/navigation.

Search cards remain on the cover-free compact branch. Map icon fields/uploads,
metallic background, route guards, editorial sections and favorites are unchanged.

## Required backend integration (not deployed or live-verified)

The checkout has rule fragments, not a complete authoritative Firebase deployment.
Merge storage-photo-galleries.rules into service firebase.storage /b/{bucket}/o.
Remove overlapping permissive writes because Firebase allows are ORed. Gallery
creation/deletion is admin-only; review creation is owner-only before the review
exists, and deletion is owner/admin. Existing objects are immutable: update is
denied. JPEG and <=5MB checks apply server-side. Enable Storage's Firestore IAM
access when prompted; ensure role/premium fields are server-controlled. If your
existing review-create policy has additional trusted requirements, apply the SAME
requirements to review Storage create; do not weaken that policy.

firestore-photo-galleries.rules contains additive constraints/instructions for
the existing admin-shop and owner-review predicates. Include galleryImages in the
admin shop field allowlist and images in the review-create allowlist. Keep existing
review ownership/text/rating/timestamp/no-overwrite and aggregate transaction rules.
Normal users must still only update ratingAverage/ratingCount on shop aggregates,
never galleryImages. Do not replace those predicates with a broad allow-write rule.
Existing article Firestore/Storage rules and private-body migration documented in
article-rich-content.md still apply unchanged. Public shop/review download URLs
must never be used for private article images.

No rules were deployed, objects uploaded, or production data migrated here. Test
backend denial for signed-out users, other review owners and non-admin gallery
writers, plus allowed owner/admin operations and free/Premium article byte reads.
If restrictive rules reject a new field/path, deploy the merged policies rather
than introducing a frontend-only workaround.

## Changed files

New: lib/photoGallery.ts, lib/photoStorage.ts, components/PhotoManager.tsx,
components/ShopPhotoGallery.tsx, components/ArticlePhotoGallery.tsx,
components/ReviewStackedPhotoCarousel.tsx, storage-photo-galleries.rules,
firestore-photo-galleries.rules, tests/photo-galleries.test.cjs, this document.

Modified: types/shop.ts, types/review.ts, hooks/useShops.ts, hooks/useReviews.ts,
lib/reviews.ts, lib/infoArticles.ts, lib/articlePersistence.ts,
app/admin/add-shop.tsx, app/admin/edit-shop/[id].tsx, app/info/article.tsx,
components/ShopDetailContent.tsx, components/ReviewComposer.tsx,
components/ReviewMessage.tsx, components/ArticleContent.tsx,
components/PremiumArticleContent.tsx, components/ArticleBlockEditor.tsx,
components/InformationFeed.tsx, components/ui/PostCard.tsx.

## Verification

32 Node regression tests pass, including legacy/empty/malformed/private photo
handling, one-step carousel bounds, retained-file ordering, owner/admin/entity
boundaries, partial-upload rollback, atomic review rating/photo references and
shop commit-before-delete/failure cleanup. New modules pass targeted ESLint.
All-platform Expo export succeeds. Whole-project checks retain the existing five
TypeScript errors and 31 lint errors plus one warning.

Manual acceptance remains: real Firebase uploads and persistent order after reload,
all Add/Edit/remove cases, auth and direct-byte permission tests, iOS/Expo Go and
Android gestures, web pointer swipes, failed URLs/slow networks, rotation/small
screens, and horizontal galleries inside both collapsed/expanded bottom sheets.
Confirm vertical page scrolling is never stolen by a horizontal gesture and test
rapid left/right stack swipes and release/termination outside the carousel.
No physical-device or browser gesture behavior was claimed verified.
