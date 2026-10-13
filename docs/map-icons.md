# Map icons and marker priorities

## Implementation

- `lib/markerPriority.ts`: shared normalized engagement scores, configurable 35% favorites / 35% routes / 30% rating weights. Rating quality = (rating / 5) × reviewCount / (reviewCount + 10), then each metric divides by its dataset maximum.
- Positive scores determine interpolated 50th/80th percentile boundaries. Medium is at/above median, high strictly above 80th percentile. Zero scores are low; fewer than three positive scores cannot become high; identical positive scores remain low.
- `components/ShopMap.native.tsx`, `.web.tsx`: pastel translucent halos, opaque circular icons, independent status dots, selected red outline. Shared screen-space collision suppression prioritizes selection, score, then ID. Labels appear from zoom 13; marker separation relaxes at zoom 13 and 15. This checkout had no existing zoom-adaptive system.
- `components/MapIconEditor.tsx`, `lib/iconCrop.ts`: draggable circular preview, accessible zoom controls, exact crop transformed into 256×256 JPEG at 85% quality. Existing picker plus new SDK-compatible `expo-image-manipulator`; no other crop dependency. Both preview and marker mask the same square crop into a circle.
- `app/admin/add-shop.tsx`, `app/admin/edit-shop/[id].tsx`: dedicated selection, confirmation, preview, replacement and removal. Untouched edit state is `undefined`, preserving stored fields.
- `types/shop.ts`, `hooks/useShops.ts`, `lib/shopMapIcon.ts`: Firestore `mapIconUrl`, `mapIconPath`; object path `shops/{id}/map-icon/{timestamp}-{random}.jpg`. Cover/gallery data is independent. Allocate document ID before upload; delete newly uploaded icon on failed document save; commit replacement/removal before cleaning old object. Cleanup denial reports a path for retry; old-object cleanup failure after successful commit logs a warning.
- `tests/markers.test.cjs`: score sparsity/ties, rating confidence, collision selection, crop bounds.
- `package.json`, `package-lock.json`: Expo image manipulator dependency.

## Security and limits

The upload helper requires Firebase authentication and `users/{uid}.role == admin`, matching existing account roles. This client guard is not a substitute for deployed security rules. No Storage rule source, emulator configuration, or deployed rule snapshot exists in this checkout; live admin uploads and unauthorized-write denial have not been verified. No rules were changed or deployed.

Existing rules must permit authorized admins to create/delete/read the icon prefix (including before a shop document exists), enforce JPEG content type and a 1MB upload limit, and deny unauthorized writes. Do not add public writes. Firebase Console/emulator verification is required before release. A ruleset limited to `/cover` paths will need an admin-only icon-path extension using its existing admin predicate.

Picker restricts still-image types and rejects reported source sizes above 20MB; processed uploads must be JPEG, nonempty and at most 1MB. Native images use authenticated binary REST upload, web uses Firebase SDK uploadBytes. Unique URLs prevent stale image caching. Failed cleanup or an app crash between Storage upload and Firestore commit can leave a file; server-side orphan reconciliation is required for crash-proof guarantees. Native maps use cached Expo images and redraw after image load, with tracking stopped after initial capture.

No simulator/device or connected browser is available. Real-device drag/crop, Storage permissions, native marker snapshots and dense-map visual behavior still require runtime QA.
