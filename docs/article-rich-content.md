# Article images and ordered content

The admin Add Post editor supports multiple Public/Premium images, replacement,
removal, ordering, and ordered text/image blocks. Images are staged locally until
Save. Preview uses those same blocks and staged images. Existing legacy body text
becomes one text block when edited, without rewriting it until Save.

Public article documents retain title, tags, Abstract, publication metadata, and
`contentVersion: 2`, `publicImages`, `publicBlocks`, `publicGalleryImageIds`.
Premium text, `bodyBlocks`, and `premiumImages` reside in
`{collection}/{articleId}/private/content`. Saves use one atomic Firestore batch.
The five supported collections are info_shop, info_event, info_size, info_trend,
and posts. The older /posts route also reads the protected content.

Storage objects use `articles/{collection}/{articleId}/{public|premium}/{version}.jpg`.
Only path references and dimensions are persisted. Public images inserted only in
the Body are omitted from the public gallery; their access classification remains
Public, so their bytes are still publicly readable. Select Premium for confidential
images. The entire Body, including its placement/order, stays private.

Premium images use authenticated REST requests with Firebase ID tokens, never
`getDownloadURL` or persisted signed URLs. Upload clears and verifies the absence
of download tokens and fails with cleanup if that cannot be ensured. Native
renders a temporary local file; web renders a Blob URL. Unmount disposes it;
Premium Expo Image caching is disabled. Client-readable bytes cannot be revoked
from someone who has already copied them while entitled. No TTL is introduced.
Replacement uploads a new version first. Removed objects are deleted after commit;
failed saves delete only new uploads. Cleanup failures are reported for admin
follow-up. No bucket lifecycle policy is altered by this checkout.

## Required backend rollout (not deployed by this change)

1. Back up the five article collections and inspect existing Firestore/Storage
   rules. Ensure users cannot write their own role/premium entitlement fields.
   The fragments use the app's current trusted users/{uid} role (admin/premium)
   or premium boolean. Adapt these predicates if billing uses a different trusted
   entitlement source.
2. Add the functions/matches from `firestore-article-content.rules` inside your
   existing `service cloud.firestore` documents block, and those from
   `storage-article-images.rules` inside your Storage object block. These are
   fragments, not complete deployable rule files. Keep unrelated shop/user rules.
   Remove overlapping permissive article rules: allow statements are ORed, so
   restrictive new rules cannot override a broader public rule. Enable the
   Firestore cross-service IAM permission when Firebase prompts.
3. Before enabling public article reads, migrate all existing public body fields.
   Firestore rules cannot redact individual fields. Existing legacy documents
   therefore remain readable at the backend until migrated, regardless of UI
   masking. Use trusted operator ADC credentials, not client credentials or a
   committed service-account key. In an isolated operator directory install
   `firebase-admin`, set NODE_PATH to that directory's node_modules and select
   the correct Google Cloud project. Run from this repo:

       node scripts/migrate-article-content.cjs

   Inspect its dry-run paths, then execute:

       node scripts/migrate-article-content.cjs --apply

   The script atomically copies each legacy body into private/content and removes
   the public body. It preserves IDs, metadata and timestamps, skips v2 records,
   and aborts instead of overwriting existing private documents. Pause article
   writes during migration. The script requires firebase-admin in the operator
   environment; it is deliberately not a mobile app dependency. Review backup and
   migration output before enabling reads. Rules deployment and migration must be
   coordinated in your Firebase project; neither was executed here.
4. Publish the merged rules through your project's Firebase deployment process.
   Test unauthenticated/free/Premium/admin Firestore reads and direct Storage byte
   requests. Free users must receive permission-denied for private/content and
   Premium images; Public images must remain readable. Verify Premium metadata
   contains no firebaseStorageDownloadTokens. Test the upload/create rule in the
   real project: if its token policy rejects upload, do not relax Premium reads or
   add download URLs; use a trusted server upload endpoint with the same path
   model and token-free metadata.

## Validation and manual acceptance

Local tests cover block ordering/removal, public-field filtering, atomic private
writes, Body-only gallery exclusion, failed-save cleanup, new-document writes,
and the existing Body mask. Run `node --test tests/*.test.cjs`,
`npx tsc --noEmit`, and `npm run lint`.

On iOS and Android, add several Public and Premium images, replace/remove/reorder,
insert images between Japanese/English paragraphs, and compare Preview with the
saved detail. Reopen after reload; confirm persistent paths and order. Repeat as
free, Premium and admin; downgrade/log out while viewing Premium content. Confirm
private images cannot be downloaded directly without entitlement and no premium
text appears in public snapshots. Verify keyboard scrolling and removal of staged
images, and inspect cleanup warnings/Storage after failed saves. Instagram's
48px link target should appear directly below its label and open the same profile.

Live Firebase authorization, upload-token behavior, reload persistence and device
interaction require project/device access and remain unverified locally.
