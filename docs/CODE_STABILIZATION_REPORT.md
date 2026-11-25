# URBn code stabilization report

**26 November 2026 JST**

The working tree now passes TypeScript, ESLint and all 60 local tests. Web, iOS and Android Expo exports completed. The remediation covered component and ref types, hook lifecycle issues, cross-account state, stale review responses, Web review deletion and a failing legal navigation regression. Release readiness still depends on runtime validation, dependency advisory review and the open items in the [App Store release checklist](APP_STORE_RELEASE_CHECKLIST.md).

## Baseline and final results

Measured on the working tree based on `f0c7342`, including existing local app, Expo configuration, account UI, legal routes/content/tests, Firestore proposal, documents and historical backups. The baseline legal test failed for signed-in account links. The work preserved its original expectation.

| Metric | Before | After | Status |
|---|---:|---:|---|
| TypeScript errors | 5 | 0 | Pass |
| ESLint errors | 48 | 0 | Pass |
| ESLint warnings | 7 | 0 | Pass |
| Passing tests | 57 | 60 | Pass |
| Failing tests | 1 | 0 | Pass |
| Web export | Pass | Pass | Static HTML and Web JS emitted |
| iOS export | Pass | Pass | Metro/Hermes bundle emitted |
| Android export | Pass | Pass | Metro/Hermes bundle emitted |

Commands used were `node --test tests/*.test.cjs`, `./node_modules/.bin/tsc --noEmit --pretty false`, `./node_modules/.bin/eslint app components context hooks lib scripts tests theme types content`, and `expo export --platform all` with distinct temporary output directories. `git diff --check` passed. The static output included all three policy URLs and Support. The baseline export logged Leaflet CSS image-resolution warnings. The Web map remains on the device/browser smoke-test list.

## Causes and fixes

| Area | Root cause and remediation |
|---|---|
| Shop detail and sheet | The ref used the ScrollView component type where React Native expects its instance. Both sides now use `ComponentRef<typeof ScrollView>`. Web review deletion used React Native Web's no-op `Alert.alert`; it now uses browser confirmation. A failed shop aggregate refresh no longer turns a completed review write into a reported write failure. |
| Symbols | The fallback used the entire `expo-symbols` name union as mapping keys, including a platform object type. The mapping now validates string SF Symbol names and derives supported names from its own keys. |
| Search, favorites and admin animation | Render read mutable refs and constructed disposable animation objects or new ranking seeds. Stable lazy state now owns those values. Search uses its typed refresh API and cancels an active reveal animation on effect cleanup. The favorite button serializes presses and settles on rejection. Shop creation stops scheduling toast and navigation work when its screen has unmounted. |
| Account and auth | The signed-in legal rows used imperative navigation without a real Web link. Both account states now use Expo Router links. Auth derives profile fields from the current UID, clears another account's state and ignores stale snapshot and refresh results. Premium determination and Auth methods keep the same policy. |
| Favorites and notifications | The favorites singleton previously ignored the first signed-out event and could keep the prior account's list visible until the next snapshot. React now consumes a stable external-store snapshot, publishes reset state immediately and rejects stale session callbacks. Announcement read state is tied to its account, rollback affects the failed read, and admin tab visibility reflects the current role. |
| Firestore hooks | Review loads are scoped by shop and request, with cleanup for superseded work. Shop and legacy post subscriptions reuse stable queries and handle a missing Firebase instance. Legacy feed hooks derive initial or fallback state and retain their existing subscription cleanup. Web color-scheme hydration uses separate server and client snapshots. Maps guard memoization tracks the UID it uses. |
| Tooling and imports | Removed unused code and stale directives, replaced runtime imports with typed imports where supported, and checked the native-only Firebase persistence export at runtime. The migration lint exception is limited to two intentionally external Admin SDK imports in one file. The CommonJS seed declares its Node-provided `__dirname` for that file. |

### Files modified

- Routes and screens: `app/(tabs)/favorites.tsx`, `app/(tabs)/list.tsx`, `app/admin/add-shop.tsx`, `app/favorites/list.tsx`, `app/notifications.tsx`, `components/AccountScreen.tsx`, `components/ShopDetailContent.tsx`, `components/ShopSheet.tsx`, `components/ui/FavoriteButton.tsx`, `components/ui/icon-symbol.tsx`.
- State and data: `context/announcements.tsx`, `context/auth.tsx`, `hooks/use-color-scheme.web.ts`, `hooks/useAnnouncements.ts`, `hooks/useFeed.ts`, `hooks/usePosts.ts`, `hooks/useReviews.ts`, `hooks/useRouteGuard.ts`, `hooks/useShops.ts`, `lib/favorites.ts`, `lib/firebase.ts`, `lib/uploadImage.ts`.
- Tooling and documentation: `eslint.config.js`, new `tests/stabilization.test.cjs`, this report and the [release checklist](APP_STORE_RELEASE_CHECKLIST.md).

### Regression coverage

Two focused tests cover favorites signed-out initialization and rejection of a prior account's results, and review requests finishing out of order across shops and within one shop. Existing tests cover ranking, map selection helpers and gestures, discovery, review/photo persistence, editorial and publication, legal routes and signup agreement. The pre-existing legal link assertion now passes without a test change. Authentication, account switching, user interactions, billing and admin workflows still require end-to-end runtime validation.

## Dependencies and build environment

- Root dependency specs match the lockfile. All installed direct versions match the lockfile and `npm ls --depth=0` reported no problems. Installed Expo 58.0.26, React Native 0.88.1, React 19.3.0, Expo Router 58.0.32 and Firebase 12.19.0 were retained.
- Expo's offline `install --check` reported dependencies up to date, with its offline reliability warning. Expo Router resolved Web and native entry points during bundling. Existing app, TypeScript and Babel configuration and the package manifest and lockfile were preserved.
- A read-only npm audit reported **4 high and 5 moderate package findings**. The high findings are the Firebase/Firestore chain through `@grpc/grpc-js` 1.9.16. The moderate findings are in the Expo fingerprint and Babel module-resolver chains through glob/minimatch. The registry proposed disruptive top-level version changes, including downgrades. No package remediation was attempted. Review fixed compatible transitive versions and actual Web, native and tooling exposure before selecting a dependency change.
- No browser session was available. Native compilation, signing, simulator and physical-device behavior are unverified. On this host `xcode-select` points to Command Line Tools and Java runtime is unavailable. The exports verify bundling and static output.

## Residual work and founder decisions

- Run a clean install in CI and verify the locked dependency graph against the approved release environment. Review the advisory remediations as a dedicated dependency change. Keep Firebase Admin in a separate authorized operator environment, with its own reproducible dependency setup before running privileged maintenance.
- Verify the new paths in an authorized browser and on signed staging builds. Prioritize legal links, review deletion confirmation and aggregate refresh failures, transitions between accounts, favorites animations, search reveal, map-sheet gestures, Firebase native persistence, announcement reads, shop creation and review photos. Test billing and form state as regression checks.
- Retain historical config copies, migration tooling, uncertain legacy consumers and future scaffolding until their usage is confirmed. The dormant cover upload helper still uses a native-only upload API and the current shop creation route passes no cover URI. Remaining raw diagnostics and production environment separation belong to the release hardening workstream.
- Open founder decisions remain the approved dependency remediation scope, launch policy and Premium strategy, moderation and account deletion scope, and legal document publication. This session made no production changes and ran no maintenance scripts.
