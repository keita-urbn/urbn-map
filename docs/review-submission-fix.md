# Review multi-image failure investigation

Verified code defect: uploadPhoto, preparePhotos and addReview awaited rollback
inside catch before rethrowing the original error. If deletion failed, its generic
Error replaced the upload/Firestore error. uploadPhoto attempted deletion even
when upload failed before creating an object. That message had no Firebase code,
which explains `undefined` when logging error.code. It does not prove the original
thrown value was non-Error. The supplied logs cannot identify the first failed
remote operation or the deployed rule that rejected it.

Fix: track successful Storage completion separately from download-URL retrieval;
only delete that object's path after upload succeeded. Stage-level and transaction
rollback errors are logged separately and never replace the original error/value.
Non-Error throws are normalized at the review boundary, preserving message/code.
Credential fields, authorization strings, JWTs and download tokens are redacted
in diagnostics. No review text or image bytes are logged. Diagnostics distinguish
source-read, image-processing, storage-upload, download-url, review-preflight,
review-payload, firestore-transaction and cleanup stages.

Stable identity remains Firestore shops/{shopId}/reviews/{uid}, as before: uid is
the review ID and the same uid is used in reviews/{shopId}/{uid}/images/{file}. The
shop segment prevents uid collisions across different shops. No draft review is
created before uploading. Files upload sequentially; successful new paths are
tracked explicitly. Metadata is checked and copied into plain serializable
objects before the transaction. Extra/local URI fields are stripped; missing or
invalid required values fail before Firestore. Ordered metadata schema unchanged.
Text-only payload omits images entirely to retain legacy allowlist compatibility.
Review+shop rating aggregate still commits in one transaction. A synchronous
composer lock complements posting state to stop duplicate rapid submit events.
Composer text/photos clear only after commit succeeds. Review stack and shop/post
UI, galleries, icons, backgrounds and navigation were not changed.

## Backend requirements

No complete deployed review rule source, Firebase deployment config, operator
credentials or failing response was available. Rules were NOT deployed and a live
submission was NOT performed. Do not consider production submission fixed until
rules and runtime verification pass.

Merge the existing review Storage match in storage-photo-galleries.rules with
actual deployed rules. Actual path is reviews/{shopId}/{reviewId}/images/{filename}.
Create authorizes request.auth.uid == reviewId, an existing shop and a nonexistent
review; thus it does NOT require an unfinished review document. Delete authorizes
owner/admin without requiring the deleted/unfinished review to exist. JPEG <=5MB;
immutable unique objects. Remove any overlapping permissive rule; do not broaden
writes to arbitrary signed-in users. Enable cross-service Firestore IAM access.

For Firestore, include images in the EXISTING review-create allowed-field list,
and append reviewImagesValid(shopId, reviewId) from firestore-photo-galleries.rules.
This validates <=5 plain metadata entries owned by the shop/review path. Preserve
all existing owner/uid/rating/text/timestamp/one-review-per-user and atomic aggregate
checks. The helpers are fragments, not a stand-alone rules deployment. Shop/image
and article rules are unchanged. Storage rule deployment may explain current
create AND delete failures, but that is an unverified hypothesis.

## Local verification and remaining steps

44 Node tests pass. New failure tests cover 0/1/2/5 metadata entries, original
Firestore error with failed rollback, failed upload with no object deletion,
download-URL failure after upload with failed cleanup, plain-payload sanitization,
credential-redacted diagnostics and existing partial-upload/entity guards.
Targeted ESLint passes. TypeScript retains five existing unrelated errors.

On the actual app submit text-only, 1 photo and 2-5 photos; confirm live objects,
review metadata/order and aggregate rating. Deny the second upload, then deny the
Firestore commit, and separately deny cleanup: confirm original stage/code stays
visible and only successful new uploads are cleanup candidates. Test expired auth,
invalid URI, slow network and rapid double tap. Test unauthorized uploads/deletes
and legacy review reading, stack swipes and review deletion. Use the redacted
[review-pipeline] stage/code diagnostic to identify the actual remote rejection.
Do not paste tokens or credentials into logs/chat.

Files: lib/reviewDiagnostics.ts (new), lib/photoStorage.ts (shared rollback
correction required by reviews; shop UI and data schema unchanged), lib/reviews.ts,
components/ShopDetailContent.tsx, firestore-photo-galleries.rules (review-only
helper addition), tests/photo-galleries.test.cjs, tests/review-submission-failure.test.cjs
(new), and this document.
