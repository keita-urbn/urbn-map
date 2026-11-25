# URBn App Store release readiness audit

**25 November 2026 (JST) · Decision: hold submission · Founder approval pending**

The shortest safe path is **Scenario B, a free launch with the simulated purchase flow removed**. Both scenarios require in-app account deletion, a defensible Firebase authorization baseline, production privacy disclosures, a signed and tested iOS build, and App Store Connect readiness. If reviews remain visible or writable, launch also requires the user-generated content controls in §1.2. The current purchase flow writes Premium directly from the client and cannot ship as a paid subscription.

## Scope and verification

Reviewed the working tree based on `f0c7342`, including existing local edits. Evidence below refers to that snapshot. The repository includes source, static web artifacts and config backups. The archives and backups are historical artifacts and were not treated as release candidates. Production Firebase rules, buckets, IAM, Auth configuration, indexes, quotas, data and logs were unverified. No authorized production rules export or connected admin session was available. Apple Developer, EAS, App Store Connect and device state were unverified. No native archive, standalone runtime, emulator rules test or TestFlight session was performed. Local `xcodebuild` is unavailable because the active developer directory contains only Command Line Tools.

| Local check | Result |
|---|---|
| `node --test tests/*.test.cjs` | 44 passed across 12 files. Covers mocked review/photo and article persistence, maps and ranking helpers, UI assumptions and migration logic. |
| `./node_modules/.bin/tsc --noEmit --pretty false` | Five errors. ScrollView instance/ref typing in `ShopDetailContent.tsx:121,203` and `ShopSheet.tsx:37`, plus symbol name key/index typing in `components/ui/icon-symbol.tsx:8,40`. |
| `./node_modules/.bin/eslint app components context hooks lib scripts tests theme types` | 48 errors, 7 warnings. Examples include render-time ref access/randomness, effect state updates, memoization checks, unresolved Firebase Admin imports and CommonJS globals in maintenance scripts. |
| Manifest and lockfile | Root dependency specs align. Installed Node 24.16.0 meets Expo's published minimum for SDK 58. No clean install, independent dependency advisory scan, native dependency build or signature validation was performed. |
| Image metadata | iOS app icon is 1024 × 1024 without alpha. Splash source is 1024 × 1024 with alpha. Actual rendering and brand approval are pending. |

## Feature inventory

| Surface | Source-supported behavior and boundaries |
|---|---|
| Navigation and discovery | `app/_layout.tsx` wires theme, typography, auth, announcements and branded startup. `app/(tabs)/_layout.tsx` supplies map, list, explore, favorites and account tabs. Shop detail, article, notifications, signup and admin routes are separate. Public browsing is designed to work signed out. Verify deployed reads and deep links. |
| Auth and account | `app/login.tsx` routes to the account UI. `app/signup.tsx` and `context/auth.tsx` use Firebase email/password. `lib/firebase.ts` attempts native AsyncStorage persistence. Account screen offers sign-in/out and simulated plan/restore. No account deletion, reauth, password reset or email verification flow found. |
| Shops and maps | `hooks/useShops.ts` supplies live shop data and create/update/delete. Admin editor handles galleries, icons, hours, editorial and Google Maps URLs. `ShopMap.native.tsx` uses react-native-maps. Web uses Leaflet and OSM tiles. External maps handle navigation. The Expo Location package is installed and no application location permission request or GPS read was found. |
| Reviews and favorites | `lib/reviews.ts` implements one review per UID per shop, rating aggregate transactions and removal. `ShopDetailContent.tsx` exposes author deletion. `PhotoManager.tsx` and `lib/photoStorage.ts` select, transform, upload and clean up images. `lib/favorites.ts` uses transactional counters and user-owned documents. Client-side usage gates exist. |
| Editorial and admin | `InformationFeed.tsx`, `lib/infoArticles.ts` and `app/info/article.tsx` implement categorized information and article views. `app/admin/add-post.tsx` and `lib/articlePersistence.ts` write split public/private content. `app/posts/index.tsx` still exposes a legacy route. `lib/chat.ts` and `InfoChatFeed.tsx` contain legacy posting code, while the article route imports its presentation component. No current general-user chat surface was identified. |
| Notifications | `app/notifications.tsx`, `context/announcements.tsx` and `lib/announcements.ts` implement an in-app feed, read state and admin publishing. No push SDK, APNs token registration, push sender or push permission prompt was found. |
| Environment and assets | `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, Babel/ESLint configs, `vercel.json`, scripts and assets support Expo source and web workflows. In-repo assets include branding, texture, Anton and its license. No `eas.json`, native iOS directory, complete Firebase deploy config, or iOS archive was found. |

## Issue register

P0 blocks submission. P1 must close before production and also before submission wherever it affects the reviewed build, user safety or required metadata. P2 is an improvement with a workable launch path. P3 is post-launch scope. Effort is an engineering or owner estimate in person-days and excludes account approval, Apple review and calendar lead times. File paths under “Change” are proposed touchpoints, including new files where needed.

### P0-01 · In-app account deletion

**Requirement and evidence.** §5.1.1(v) applies because `app/signup.tsx` and `context/auth.tsx` create accounts. `components/AccountScreen.tsx` exposes sign-out and has no delete path. No deletion worker or Auth deletion implementation exists. User data also lives under `users/{uid}`, favorites, usage, announcement reads, shop reviews and review Storage paths.

**Change and dependencies.** Add a discoverable localized account action, clear confirmation, recent email/password authentication, cancellation and progress/error states. Add a trusted idempotent deletion job with ownership checks, write fencing while pending, retry/reconciliation and documented retention. Reconcile review and favorite aggregates, remove associated personal data, media and subcollections, delete Firebase Auth and terminate sessions. Review legacy records and administrator-authored records for lawful retention and de-identification. Under A, give Apple subscription management and explain that billing may continue. Allow immediate account deletion even when a subscription is active. Touch account/auth, new backend, rules, review/favorite/media modules and support policy. Depends on data inventory and approved retention. **4–8 days.**

**Acceptance and validation.** A user can initiate deletion in-app with stale credentials and see clear outcomes. Staging verifies cancel, wrong password, complete recursive deletion, resumed partial failure, concurrent writes, Auth removal, public media removal and active-subscriber guidance. [Apple account deletion](https://developer.apple.com/go/?id=ar-ad-support)

### P0-02 · UGC safety and moderation

**Requirement and evidence.** §1.2 requires filtering objectionable content, reporting with timely responses, blocking abusive users and published contact details. `components/ReviewComposer.tsx`, `ShopDetailContent.tsx`, `lib/reviews.ts` and `lib/photoStorage.ts` implement posting, photo handling and author removal. The lower-level review removal function checks owner/admin, but no complete mod queue, report, block, screening or published safety workflow was found. `storage-photo-galleries.rules` permits public review image reads independent of publication.

**Change and dependencies.** Screen text and images before publication, stage private uploads, add review/user reporting and an effective block control, provide a minimal moderator queue or controlled existing admin workflow with removal and account sanctions, and publish Japanese guidelines and support contact. Establish response coverage and escalation. Touch review screens, new moderation backend/admin tools, Firestore/Storage rules and support pages. **5–10 days.** If chosen as an explicit scope change, disable both review reads and writes and public access to associated media on the release surface until controls are ready.

**Acceptance and validation.** Rejected and pending content stays private, users can report and block, moderators can remove content and associated media, reports reach staffed support, and repeat posting/upload abuse is constrained. Verify with staging identities, retained public URL checks and a moderator response drill. [App Review Guidelines §1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content)

### P0-03 · Simulated Premium and untrusted entitlement writes

**Requirement and evidence.** §2.1 and §3.1 apply to completeness and paid digital features. `app/premium.tsx` and `AccountScreen.tsx` invoke simulated purchase/restore. `lib/premiumPurchase.ts:39` merges `premium`, `plan` and `premiumSince` into the current user record. `context/auth.tsx` and article rules consume user-document role and entitlement fields. The client write is confirmed. Production permission and actual entitlement changes are unverified.

**Change and dependencies.** A uses Apple IAP and trusted entitlement state. B removes purchase, restore, plan billing and upsell entry points, including deep links and limit messages, and defines free feature behavior. Both deny client writes to privileged fields, resolve legacy beta state, and account for any other web or legacy client sharing Firebase. Touch Premium route/library, Account, auth, information, favorites, usage and rules. **B: 2–4 days; A: 10–18 days** including P0-08. Depends on founder product decision and P0-04 authorization design.

**Acceptance and validation.** Staging and signed build prove regular accounts cannot self-upgrade. B contains no simulated purchase, restore, billing or broken locked path. A covers the complete Apple purchase lifecycle. [App Review Guidelines §§2.1, 3.1](https://developer.apple.com/app-store/review/guidelines/)

### P0-04 · Authoritative Firebase rules and admin boundary

**Requirement and evidence.** §5.1.1 and §1.6 require protection of user data. The six checked-in rules files are integration fragments. `app/admin/_layout.tsx`, `add-shop.tsx` and `edit-shop/[id].tsx` lack a shared role gate, despite admin-only navigation affordances. Article add has an explicit UI gate. Admin helpers in article, announcement and Storage rules trust `users/{uid}.role`. Production owner access, role writes, Storage IAM and broader overlapping allows are unverified.

**Change and dependencies.** Obtain authorized read-only rule exports and index/IAM configuration. Reconcile into versioned full rules, use trusted role assignment, owner-only user and subcollection access, schema and timestamp restrictions, and least-privilege admin enforcement for shops, covers, map icons, articles, announcements and review moderation. Add a shared admin UI gate as defense in depth. Check all overlapping rules and bucket paths. Touch Firebase config/rules, admin layout, auth and Firestore/Storage services. **4–8 days.**

**Acceptance and validation.** Compare rule versions and approved diffs, run emulator regressions for guest, owner, other user, regular, Premium and admin against all collections and Storage prefixes, verify staging allowed actions and authorization denials, and record production parity after an approved deployment. [App Review Guidelines §§1.6, 5.1](https://developer.apple.com/app-store/review/guidelines/)

### P0-05 · Article publication and Premium data exposure

**Requirement and evidence.** §§2.1, 3.1 and 5.1. `firestore-article-content.rules` public read covers every matched top-level article without checking publication time/status. `lib/infoArticles.ts` filters publication in the UI and `lib/posts.ts` handles legacy body fields. New writes split public and private content in `lib/articlePersistence.ts`. `lib/articleStorage.ts` uses different public/private access paths. Existing production drafts, legacy bodies and persistent download-token behavior are unverified.

**Change and dependencies.** Define public feed queries that match rules or use a dedicated published projection. Separate drafts and exclude private payloads from public records, including legacy fields. For A use authoritative entitlements for private reads and verify media has no reusable public download URL. For B publish only founder-approved content and leave private/draft data protected. Stage and validate migration before tightening reads, with a rollback plan. Touch article migration, feed queries/readers and rules. **3–6 days.** Depends on rules and launch scope.

**Acceptance and validation.** Staging proves guest/public, unpublished, scheduled, entitled, expired and admin access for both data and image bytes. Check legacy paths, publication transitions and historical URL revocation where needed. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### P0-06 · Privacy policy, disclosures and native privacy declarations

**Requirement and evidence.** §§5.1.1–5.1.2. No in-app privacy policy link identified in account or shared routes. `app.json` has no explicit iOS privacy manifest configuration. Firebase, AsyncStorage, React Native and Expo packages are present in the JS dependency graph. Native SDK manifest/signature presence is unverified, as are actual service-side collection and retention.

**Change and dependencies.** Publish an accessible in-app and App Store Connect privacy policy describing data, purposes, processors, consent, retention, revocation and deletion. Confirm collection with product/operations and complete App Privacy disclosures. Audit the archive for actual native SDKs, required manifests/signatures where applicable, SDK-contributed declarations and Apple-approved API reasons, including storage, preferences or filesystem APIs where actually used. Add Expo app-level manifest declarations as needed. Touch `app.json`, account/help/legal routes and metadata. **2–5 days** plus policy review.

**Acceptance and validation.** Guest-accessible production policy, verified disclosure worksheet, Xcode privacy report and archive inspection reconcile actual app and third-party behavior. Recheck with any billing SDK added in A. [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/) · [Apple SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/) · [Required Reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) · [Expo privacy manifests](https://docs.expo.dev/guides/apple-privacy/)

### P0-07 · Signed iOS build and review access

**Requirement and evidence.** §§2.1, 2.3 and 4.2. `app.json` sets version 1.0.0, portrait, dark, a generic display name/slug and tablet support. Bundle ID, explicit build-number strategy and EAS project/build/submit profiles are missing from the tree. Expo SDK 58 targets RN 0.88, iOS 16.4+ and requires Xcode 26.4+ per Expo. Apple requires Xcode 26+ with the iOS 26 SDK or later for uploads since 28 April 2026. Expo documents a SDK 58 EAS image. Local Xcode, native compatibility, signing, production endpoints and review account access remain unverified.

**Change and dependencies.** Use founder-approved bundle ID and URBn display branding, version/build management, an explicit supported EAS toolchain or equivalent archive pipeline, validated environment injection, distribution signing/provisioning and App Store Connect app record. Verify native modules including maps, Expo image/picker/manipulator/filesystem/splash, Reanimated/worklets, gesture handler, screens and AsyncStorage. Provide stable non-admin demo access, populated Japanese test data and review notes covering guest, review safety, account deletion and A purchases. Touch `app.json`, `eas.json`, release pipeline and metadata. **3–6 days** plus external setup and QA.

**Acceptance and validation.** Signed archive reports intended bundle ID, build and SDK, installs on TestFlight, cold launches and completes critical flows. Reviewer can sign in while production services stay available. [Apple SDK minimum](https://developer.apple.com/news/upcoming-requirements/?id=04282026a) · [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) · [EAS images](https://docs.expo.dev/build-reference/infrastructure/) · [Expo Build](https://docs.expo.dev/build/setup/) · [Expo Submit](https://docs.expo.dev/submit/ios/) · [Review access](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review/)

### P0-08 · Paid Premium lifecycle (A only)

**Requirement and evidence.** §§2.1(b), 3.1.1 and 3.1.2. Digital articles and app features are unlocks. The repo has no StoreKit integration, native billing SDK, Apple product mapping, verified transactions, renewal handling or subscription backend. `AccountScreen.tsx` derives billing display from beta activation time.

**Change and dependencies.** Integrate StoreKit-compatible native billing via RevenueCat or direct StoreKit with server verification. RevenueCat fits Expo with a native development build and can reduce lifecycle integration, while introducing a vendor, identity mapping, webhook verification and privacy review. Regardless of SDK, use verified provider events and reconciliation as authority, deduplicate events, handle order/replay, bind purchases to Firebase UID with an explicit restore/transfer policy, distinguish sandbox from production, and handle expiry, renewal, grace/billing retry, cancellation and refunds/revocation. Use StoreKit product price and period, clear ongoing value, auto-renew terms, privacy and terms links, Restore and Manage Subscriptions. Apple paid agreements, tax/banking and approved products are dependencies. Touch Premium, account, auth, rules, backend and App Store Connect. **Included in A's 10–18 days in P0-03.**

**Acceptance and validation.** Native sandbox/TestFlight covers purchase, decline/cancel, pending, renewal, cross-device restore, sign-out/account switch, duplicate/out-of-order events, offline/reconnect, refunds, revocation and account deletion with active subscription. Give Review access to the full path and submit the first IAP with the app version. [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/) · [Apple server notifications](https://developer.apple.com/documentation/appstoreservernotifications) · [Expo billing integrations](https://docs.expo.dev/guides/in-app-purchases/) · [Review information](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review/)

### P0-09 · Store listing, screenshots and release declarations

**Requirement and evidence.** §§2.1 and 2.3. Store metadata, support/privacy URLs, platform agreements, age rating, encryption declaration and regional status are external and unverified. `app.json` enables iPad. Local icon dimensions and opacity passed inspection.

**Change and dependencies.** Confirm Apple Program team and roles, create app record under approved bundle ID, configure localizations, description, category, device screenshots, URLs, copyright and review contact. Complete age-rating questions against actual UGC, content, functionality and web access. Determine export-compliance declaration against actual encryption and distribution countries before setting any plist exemption flag. Complete applicable storefront-specific business disclosures and agreements. Supply 1–10 real screenshots per submitted device size. Portrait iPhone large Dynamic Island examples include 1260 × 2736 and 1290 × 2796. If absent, Apple requires the corresponding fallback iPhone size class. Current iPad 13-inch examples are 2064 × 2752 and 2048 × 2732. Apple lists an April 2027 iPhone Duo screenshot requirement for apps using iOS 27.1 SDK or later, so recheck if the schedule slips. Touch store metadata, release assets and app configuration. **2–4 days** after stable build, with legal and account-holder input.

**Acceptance and validation.** App Store Connect accepts required metadata and screenshots for the signed device family, all URLs resolve and are localized appropriately, and review contact and account are verified. [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) · [Age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/) · [Export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/)

### P1-01 · Review, rating and ranking integrity

**Requirement and evidence.** §§1.2 and 1.6. `lib/reviews.ts` uses Firestore transactions and author UID document IDs. `firestore-photo-galleries.rules` contains review metadata predicates and comments requiring owner identity and validated rating aggregates in the missing full rules. `firestore-ranking.rules` ties favorites to counter changes; its current route-click clause allows repeated signed-in increments. `lib/usageLimits.ts` and `lib/favorites.ts` contain client-controlled limits. Review image metadata accepts arbitrary HTTPS URLs separate from the validated object path.

**Change and dependencies.** Bind review data, aggregate changes and media references to verified identity and approved objects. Bound schema and content, use server-derived or defensibly validated counts, reconcile legacy aggregates and rate-limit meaningful engagement before using it in ranking. Under A enforce only gates that are meant to be authoritative and define consistent limits across clients. Touch reviews, media, metrics, favorites, usage and rules/backend. **3–6 days** with P0-02/04.

**Acceptance and validation.** Emulator and staging cover cross-user and malformed changes, extra images, aggregate consistency on delete, concurrent favorites and repeated metric events. Verify counters against source records and confirm external media cannot be substituted. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### P1-02 · Media lifecycle and orphan cleanup

**Requirement and evidence.** §§1.2 and 5.1. Review and article persistence attempt rollback and post-commit cleanup. `hooks/useShops.ts:76,145` stages a legacy cover outside gallery/icon rollback and deletes the parent shop separately from subcollections. Storage list/reconciliation, legacy cover and download URL cleanup, and failed deletion recovery are unverified. Public review Storage access increases the consequence of orphaned files.

**Change and dependencies.** Give cleanup a durable retry path and an integrity inventory for draft, rejected, deleted and unreferenced files. Clean reviews/subcollections and references when removing shops, preserve shared files and coordinate with P0-01 and P0-02. Touch shop, review, article and photo persistence, Storage and backend. **2–5 days.**

**Acceptance and validation.** Inject failed uploads, commits and deletes in staging, demonstrate cleanup replay, verify surviving references and confirm removed media stops resolving. [Apple deletion guidance](https://developer.apple.com/go/?id=ar-ad-support) · [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### P1-03 · Permissions, data minimization and ATT decision

**Requirement and evidence.** §§5.1.1 and 5.1.2. `PhotoManager.tsx` and `MapIconEditor.tsx` support user-initiated image selection. No app-authored picker permission wording appears in `app.json`. Location package is installed with no source GPS call identified. `useRouteGuard.ts` passes destination/search to Google Maps. No explicit ad/attribution SDK or tracking prompt was identified. Actual generated permission entries, SDK network traffic, photo metadata and backend processing are unverified.

**Change and dependencies.** Use the system picker with minimal access, localize any required purpose strings, remove unused permissions and verify actual compiled Info.plist. Confirm photo transformation strips unintended metadata, define map/processor disclosures, and keep discovery usable after a permission decline. Confirm whether data is linked across other companies' apps/websites for advertising/measurement or shared with a data broker, including any SDKs. Enable ATT before tracking only if applicable and update privacy labels. Touch native config, picker and policy. **1–3 days.**

**Acceptance and validation.** On a signed release build test selection, cancel, limited/denied access, upload failure and navigation with location denied. Record network and metadata observations and verify no unexpected microphone, camera or location request. [Expo ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/) · [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)

### P1-04 · Environment separation and production log hygiene

**Requirement and evidence.** §1.6 and §5.1. `lib/firebase.ts` logs resolved config and reports configured with hard-coded fallbacks, while other branches reference native persistence. `context/auth.tsx`, `AccountScreen.tsx`, `lib/favorites.ts`, `lib/reviews.ts` and `lib/uploadImage.ts` log raw errors, UIDs, paths and upload response bodies. Review diagnostics include some redaction. Git tracks `.env`, including Firebase public variable names. Local environment also has a hosting credential variable name. Public Firebase client identifiers are expected in client bundles. Credential values were excluded from this audit output. Actual production exposure, enabled services, retention, billing and quotas are unverified.

**Change and dependencies.** Fail clearly on missing or wrong release configuration, set distinct staging/production Firebase environments, keep service credentials out of client bundles and audit tracked artifacts and history through an approved secret scanner. Strip or sanitize production logs and error UI. Confirm vendor quotas, budgets, ownership, incident response, alerting and retention. Touch Firebase bootstrap, diagnostic sites, release env and runbook. **2–4 days**, plus any credential remediation.

**Acceptance and validation.** Inspect compiled environment selection and real failure logs using test data, verify no credentials, raw upload bodies or unnecessary identifiers are emitted, and prove a misconfigured build cannot silently use an unintended project. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### P1-05 · Native and web quality gate

**Requirement and evidence.** §§2.1 and 4.2. Some screens provide safe-area, keyboard, loading and error UI. `AccountScreen.tsx` uses empty SafeAreaView edges with layout-specific handling, `ShopSheet.tsx` combines gestures and keyboard avoidance, and root startup loads fonts and splash. Leaflet CSS is imported from the shared tabs layout. `useRouteGuard.ts` uses a Google Maps scheme probe with web fallback and config has no explicit scheme allowlist. `useShops.ts` subscribes to shop data and photo/article components render remotely sourced images. Native iPad sizing, Japanese fallback, performance, crash handling and behavior offline remain unverified.

**Change and dependencies.** Fix the five type errors and prioritize lint findings that affect rendered behavior or release CI. Use approved local/staging builds to confirm platform-specific imports, standalone auth persistence, maps fallback, nav/deep links, splash recovery, loading/empty/error states, offline reconnect, keyboard, safe areas, VoiceOver labels and focus, Dynamic Type, contrast, Japanese text clipping and glyph fallback, memory and large galleries. Resolve observed release defects before submission. Review production crash symbolication and monitoring. Touch map/tab layouts, account/shop/photo surfaces, typography and CI as evidence warrants. **3–7 days** plus device coverage.

**Acceptance and validation.** Clean release typecheck and successful device matrix including lowest supported OS where available, current iOS, compact and large iPhone and iPad if enabled. Record any accepted lint debt and verify web regressions against the shared services. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [TestFlight](https://developer.apple.com/testflight/)

### P1-06 · Rights and attribution

**Requirement and evidence.** §§4.1, 5.2.1 and 5.2.3 as applicable. Shop images, cover/logo-like map icons, reviews and editorial data are authored or uploaded through app tooling. Ownership/usage evidence for live assets, images, business marks, editorial and contributor content is unavailable. `assets/fonts/Anton-OFL.txt` exists. `ShopMap.web.tsx` includes OSM attribution and a subdomain tile template. OSM's current policy specifies the canonical tile hostname and other operational conditions. Native maps and external Google Maps/Instagram links require separate provider/brand checks.

**Change and dependencies.** Business/legal should inventory rights for logos, shop photos, contributors, editorial, wordmark, texture, stock and embedded/link assets, retain license evidence, run a takedown process and review launch territories. Engineering should remove unapproved assets on instruction, preserve font notices and confirm map attribution, URL, headers/cache and provider terms, including web policy if publicly deployed. Touch assets, map component, listing and legal records as needed. **1–4 days** plus rights clearance. Unresolved rights for shipped content block release.

**Acceptance and validation.** Approved asset/rights register and attribution visible in release capture. Verify ownership or permission for every shipped or loaded launch asset and replacement/removal of uncleared assets. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)

### P2-01 · Account recovery and authentication hardening

**Requirement and evidence.** Under §4.8, the current first-party email/password-only model does not trigger the equivalent-login requirement. Guest browsing appears supported under §5.1.1(v), while account actions require sign-in. `context/auth.tsx` has signup/sign-in/logout and no recovery or verification. Provider configuration, reset templates and enumeration protection in Firebase Console are unverified.

**Change and dependencies.** Preserve guest access and re-evaluate §4.8 if third-party login is added. Add password reset and consider email verification before publication and other abuse-sensitive actions, with privacy-preserving responses. Touch account/auth and Firebase Auth configuration. **1–3 days.**

**Acceptance and validation.** Guest can browse useful content without a sign-in prompt. Recovery handles expired links and ambiguous email existence. Verify real provider settings and reviewer credentials. [App Review Guidelines §§4.8, 5.1.1](https://developer.apple.com/app-store/review/guidelines/)

### P2-02 · Residual tooling and dependency maintenance

**Requirement and evidence.** Release hygiene under §2.1. ESLint includes app/compiler findings and maintenance-script diagnostics. `scripts/admin/migrations/backfill-favorite-counts.mjs` imports Firebase Admin which is absent from the package manifest. Legacy config/lockfile backups and `dist-final.zip` coexist with current sources.

**Change and dependencies.** Pin clean CI installation and build inputs, review package advisories and transitive licenses using the locked/native graphs, document authorized maintenance execution, and identify which historical artifacts can be retired. Touch package/lockfile, ESLint/CI and release documentation. **1–3 days.**

**Acceptance and validation.** Clean install reproduces the selected toolchain, required checks run without local artifacts, and privileged maintenance tools dry-run against staging with explicit environment controls. [Expo SDK upgrade workflow](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)

### P3-01 · Push notifications, if later requested

**Requirement and evidence.** §4.5.4 applies if push ships. The current announcements feature is in-app only, so missing APNs functionality does not block submission. `app/notifications.tsx` and `lib/announcements.ts` perform Firestore-based feed operations.

**Change and dependencies.** If separately approved, add push credentials/capability, token lifecycle, consent/prefs and retention policy without publishing sensitive payload information. Touch announcements, native config and new backend. **3–6 days.**

**Acceptance and validation.** Validate consent/denial, opt-out, token rotation and delivery on physical devices with APNs. [App Review Guidelines §4.5.4](https://developer.apple.com/app-store/review/guidelines/)

## Privacy inventory for disclosure review

| Candidate data | Source and use | Confirmation required |
|---|---|---|
| Email and UID | Firebase Auth, role records, user-owned docs and review association | Identity linkage, access, retention, recovery and deletion |
| Review text, stars and photos | Firestore and Storage. Reviews and photos are intended for public display. | Public attribution, uploader notice, moderation retention, image metadata and orphan cleanup |
| Favorites, route use, read state | User subcollections for personalization, usage control and announcements. Shop-level route/favorite/rating aggregates. | App Privacy classification, retention, aggregation and identifiers in logs |
| Shop/editorial and moderator data | Publishing and administrative workflows | Operator identifiers, creator attribution, rights and retention |
| Location and third-party navigation | Shop coordinates are catalog data. External map handoff includes destinations/search. No user GPS flow identified. | Native map SDK behavior, vendor traffic, external services and generated permissions |
| Diagnostics and network metadata | Client logs and third-party infrastructure | Delivery beyond device, access, redaction, vendor collection, retention and classification |
| Purchases and customer identifiers | Applies under A through StoreKit and optional RevenueCat | Processor terms, identity linkage, data taxonomy and actual data flows |

## Release scenarios

| Dimension | A · Paid Premium | B · Free launch |
|---|---|---|
| Product | Real Apple auto-renewing subscription and server-verified unlocks | Public discovery with a founder-approved free content and limit policy |
| Relative engineering | 10–18 person-days for billing and entitlement work above common gates | 2–4 person-days for paid-flow removal and safe free configuration above common gates |
| Dependencies | Apple agreements, banking/tax, IAP products, native SDK, backend, optional billing vendor and lifecycle support | Product scope decision, beta entitlement remediation and backend rules compatible with remaining clients |
| Security | Entitlement ownership, refund state, account transfers, private media, event verification and reconciliation | Persistent beta grants and hidden routes, shared backend clients and accidental exposure of formerly gated content |
| App Review | §§2.1(b), 3.1.1/3.1.2, product metadata, sandbox path, restoration and ongoing value | §2.1 complete free flows with no dummy billing surfaces. Other review and privacy requirements still apply. |

Founder decision required on scope, storefronts, iPad, public reviews and which formerly gated material can publish. External dependencies also include Firebase owners, a moderation/support owner, privacy and rights owner, signing team and reviewer access. Apple determines approval after reviewing the submitted build and metadata.
