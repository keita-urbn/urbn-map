# URBn App Store release checklist

**Status as of 25 November 2026 JST.** Open items require evidence or a documented scope decision. IDs refer to the [audit issue register](APP_STORE_READINESS_AUDIT.md#issue-register).

## Founder decisions and access

- [ ] Approve paid A or free B, release territories, launch content, review availability and supported device families. Name accountable release, Firebase, privacy, rights and moderation owners.
- [ ] Confirm Apple Developer Program team, roles, agreements, bundle ID and App Store Connect access. Confirm EAS ownership or equivalent authorized archive pipeline.
- [ ] Provide authorized read-only Firebase rules and configuration exports plus a staging project. Record the production project and bucket ownership privately. (P0-04)

## Application, backend and Firebase

- [ ] In-app deletion is discoverable and localized. Confirmation, recent sign-in, errors, retry and completion are tested. (P0-01)
- [ ] Trusted deletion removes account and associated records/media, reconciles counts and handles partial failure and approved retention. A includes Apple billing guidance. (P0-01)
- [ ] Reviews have prepublication text/image controls, reporting, blocking, moderator action and staffed support, or the approved launch scope excludes public review reads, writes and media access. (P0-02)
- [ ] Remove simulated purchase and restore code paths across signed-out, signed-in, legacy and deep-link surfaces. Apply approved free behavior for B. (P0-03)
- [ ] Confirm full Firestore and Storage rules, versions, IAM, indexes and production parity. Validate guest/owner/other/admin boundaries, trusted privileges, trusted entitlement writes and bounded review/media operations. (P0-04, P1-01)
- [ ] Review public/private/draft and legacy article separation, including direct data reads and image access. Validate migration, URL revocation where applicable and rollback. (P0-05)
- [ ] Verify aggregate integrity and media cleanup for rejection, removal, deletion and interrupted writes. (P1-01/02)
- [ ] Confirm production environment and resolved Firebase destinations, log redaction and credential hygiene. (P1-04)
- [ ] Verify guest discovery and ordinary-account flows using staging and review-compatible data. (P0-07, P2-01)

## Privacy, legal and operations

- [ ] Publish live guest-accessible privacy and support URLs. Publish guidelines and moderation contact where reviews are offered. Record response coverage, escalation and takedown steps. (P0-02/06/09)
- [ ] Approve data inventory, retention, consent and privacy labels. Include SDK/network and external maps behavior. Verify ATT applicability. (P0-06, P1-03)
- [ ] Inspect generated Info.plist, privacy manifests, approved API reasons, SDK signatures where required and the Xcode privacy report. Verify minimized permissions and Japanese purpose strings where applicable. (P0-06, P1-03)
- [ ] Clear launch rights for shop imagery/marks, brand assets, fonts, creator and editorial content. Verify map terms and visible attribution. (P1-06)
- [ ] Confirm backend availability, quota, monitoring, incident contact, deletion and abuse response ownership. (P0-07, P1-04)

## Native build and physical device QA

- [ ] Confirm URBn display name, bundle ID, version/build numbering, EAS or equivalent profiles, Expo-compatible Xcode/SDK, Apple distribution certificate and provisioning. (P0-07)
- [x] Run local typecheck, ESLint and test suite. The stabilization run recorded zero TypeScript/ESLint findings and 60 passing tests. [Stabilization report](CODE_STABILIZATION_REPORT.md)
- [x] Run full and production-only npm audits, remove the redundant development glob chain, and rerun typecheck, lint, 60 tests and all three Expo exports. [Dependency security report](DEPENDENCY_SECURITY_REPORT.md)
- [ ] Run a clean dependency install in CI, review the remaining four high and three moderate npm package findings and validate staging rules separately. (P0-04/07, P1-05, P2-02)
- [x] Verify Expo bundle exports for Web, iOS and Android. Signed binaries and runtime QA remain separate release gates. [Stabilization report](CODE_STABILIZATION_REPORT.md)
- [ ] Inspect release archive, production environment, native assets and splash. Install via internal TestFlight. (P0-07/09)
- [ ] Exercise cold start, resume, maps handoff, search, shop/editorial, favorites, reviews, announcements, login persistence and deletion. Exercise admin in a separate authorized QA account. (P0-07, P1-05)
- [ ] Exercise denied permissions, canceled picker, upload/network errors, empty state, offline and recovery, large galleries, crash/symbolication and web regressions. (P1-03/05)
- [ ] Check keyboard, safe areas, VoiceOver, Dynamic Type, Japanese text and compact/large iPhone, oldest supported OS where available and iPad if enabled. (P1-05)

## Paid Premium only

- [ ] Apple paid agreements, tax/banking, subscription group and product metadata are ready. Submit initial IAP with the app version.
- [ ] StoreKit prices, periods, terms, policy, restore and manage links work. Recurring value is clear.
- [ ] Server entitlement state handles account binding, renewals, expiry, billing retry, restore, refund and revocation. Sandbox and production stay isolated.
- [ ] Complete native sandbox and TestFlight purchase matrix and supply reviewer credentials that allow the full purchase flow. (P0-08)

## App Store Connect and release sign-off

- [ ] Listing metadata and actual screenshots match the final build, storefronts, devices and languages. Record age rating, export compliance and applicable regional declarations. (P0-09)
- [ ] Verify support and privacy URLs, review contact, non-admin demo credentials through a secure channel, working backend and review notes with clear navigation. (P0-07/09)
- [ ] Confirm every P0 and P1 gate with evidence or the approved scope that makes it inapplicable. Founder approves the build, reviewed scope and submission separately from implementation approval.

## Legal implementation evidence · 26 November 2026 JST

- [x] Centralized the supplied Japanese Terms, Privacy Policy and Community Guidelines with original sections and placeholders. All three are labeled Draft 0.1.
- [x] Added shared legal viewing and Support routes, Account access across roles, signup agreement preview and a Community Guidelines link in the review composer.
- [x] Prepared an opt-in, versioned agreement record service and a separate Firestore rules fragment. Local mocked tests cover the write contract, client UID checks and signup retry. Rules enforcement remains open below.
- [ ] Founder approves final wording and versions, provides the formal operator name and address, privacy contact/responsible person, working support email, and effective and revision dates. Replace all placeholders. The production release gate fails while any document remains draft or the official support contact is missing or unverified.
- [ ] Verify privacy copy against actual processing, location and photo access, data retention, consent records, and service providers. Confirm production support, deletion, review reporting, blocking and moderation before publishing copy that describes those features.
- [ ] Review the complete production Firestore rules and stage the legal fragment in an emulator. Verify owner-only get/create, immutable records, timestamp/field/version validation, and protection from wider matching grants. Provision approved version configs through trusted admin tooling before enabling the client rollout.
- [ ] Approve existing-account acceptance rollout. Verify signup recovery after Auth succeeds and the agreement write fails, and verify one acknowledgment per effective guideline version before posting. Include agreement history in approved account deletion/retention work.
- [ ] Test the signed iOS/Android UI and local browser flows, then test clean URLs, reload and browser Back on an authorized Vercel environment. Static Web export produces all four route files. The Vercel configuration maps those clean URLs to the corresponding files ahead of the existing catch-all. [Expo static rendering](https://docs.expo.dev/router/web/static-rendering/) · [Vercel rewrites](https://vercel.com/docs/project-configuration/vercel-json#rewrites)
- [ ] Publish matching approved documents on the separate public marketing website and set the public privacy and support URLs in App Store Connect. Marketing-site source and publication are external tasks.

### Firestore rollout contract

The application writes only to `users/{uid}/legalAgreements/{agreementId}`. IDs are `signup-{termsVersion}-{privacyPolicyVersion}` and `community-{communityGuidelinesVersion}`. Each history record stores the version fields and server timestamps for the particular affirmative action. Signup saves only after Firebase Auth creates an account and can retry the record without creating a second account. Existing accounts can accept through Account when rollout is enabled. Review acknowledgment is captured separately from the review write and stays recorded if a later upload or review submission fails.

Before turning on `agreementRollout.enabled` in `content/legal/metadata.ts`, the Firebase owner must review `firestore-legal-agreements.rules` in the full ruleset, resolve all broader matching grants, and provision `legalAgreementVersions/{agreementId}` with trusted admin tooling. Each configuration uses `enabled`, `effectiveAt` (Firestore timestamp matching the JST effective date), and `kind` (`signup` with `termsVersion` and `privacyPolicyVersion`, or `community` with `communityGuidelinesVersion`). Configure matching approved document status, version, effective date and revision date in the client. Keep historical acceptance immutable and retain records according to the approved policy.

Emulator coverage should include guest access, another UID, owner reads and creates, invalid or future versions, incorrect timestamps, extra privilege fields, prohibited update/delete/list and simultaneous retries. The client gate coordinates UI behavior. Enforcing acceptance as a prerequisite for all alternate or legacy review clients would require a separately approved server/rules rollout.
