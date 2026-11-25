# URBn dependency security report

**26 November 2026 JST · Expo SDK 58 · Node 24.16.0 · npm 11.13.0**

Removed the redundant Babel module-resolver plugin and its development-only glob dependency chain. npm audit findings decreased from nine to seven, with the production dependency graph at seven before and after. The remaining four high-severity package records are related to the same gRPC dependency. The remaining three moderate records trace to minimatch in Expo fingerprint tooling.

## Registry audit results

Both scans were run against the npm registry before and after the change. Counts are npm's package records, including direct dependencies with inherited findings. They can differ from the number and severity of unique advisories.

| Scan | Before high | Before moderate | Before total | After high | After moderate | After total |
|---|---:|---:|---:|---:|---:|---:|
| `npm audit --json` | 4 | 5 | 9 | 4 | 3 | 7 |
| `npm audit --omit=dev --json` | 4 | 3 | 7 | 4 | 3 | 7 |

Both scans reported zero critical, low and informational **package records**. The gRPC package record combines a high and a low advisory.

## Advisory analysis

| Advisory and severity | Installed versions and dependency classification | Affected range and upstream patch | URBn exposure and action |
|---|---|---|---|
| [GHSA-m9gg-hp2v-232j / CVE-2026-101916](https://github.com/advisories/GHSA-m9gg-hp2v-232j), high | `@grpc/grpc-js@1.9.16`, transitive production-classified via Firebase and Firestore | Below 1.13.6 and 1.14.0 through below 1.14.5. Patched in 1.13.6 and 1.14.5. npm returned the first branch for this installed tree. | Requires a Node gRPC server using a particular client-certificate configuration and using the returned auth context for authorization. URBn has no such server or auth-context usage in source. The Node Firestore transport exists in the package, with no applicable server path identified. Keep open until Firebase permits a patched gRPC version and validate Node, Web and native compatibility. |
| [GHSA-f596-whhp-79r4 / CVE-2026-101915](https://github.com/advisories/GHSA-f596-whhp-79r4), low | `@grpc/grpc-js@1.9.16`, same transitive production-classified chain | Same reviewed affected range. GitHub's reviewed entry lists 1.13.6 and 1.14.5. The [maintainer advisory](https://github.com/grpc/grpc-node/security/advisories/GHSA-f596-whhp-79r4) lists 1.13.7 and 1.14.6. Use the later maintainer-listed fixes as minimum candidates for both advisories. | Requires a Node gRPC application server throwing a method-handler error that can be sent to clients. No such handler was found in URBn. Same compatibility and remediation path as the high advisory. |
| [GHSA-3g3m-2fjr-6pw4 / CVE-2026-118773](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), moderate | `glob@9.3.5`, transitive development dependency of `babel-plugin-module-resolver@5.0.3` | 9.0.0 through 14.0.1. Patched in 14.0.2. | The potentially affected operation is Node filesystem glob walking with cancellation. The plugin's use here was for Babel alias resolution, with no application-client exposure or untrusted cancellation path demonstrated. Removed the entire chain using Expo's existing Metro path mapping. |
| [GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249), moderate | `minimatch@8.0.7` through the development glob chain, and `minimatch@10.2.6` through production-classified Expo fingerprint tooling. Other installed copies 3.1.5 and 11.0.9 are outside this registry range. | 7.0.0 through below 11.0.1. Patched in 11.0.1. The maintainer advisory specifically identifies 10.2.6 and a preprocessing mode requiring optimization level 2 or higher. | Removed the development copy. The remaining Expo call sites are Node fingerprint tooling with `{ dot: true }` and the default optimization level of 1. The installed fingerprint source documents why the vulnerable mode is unavailable through its config. No affected use on Web, iOS or Android app runtime was identified. Keep the registry finding visible and adopt an upstream-compatible update. |

## Package graph and compatibility

| npm finding | Installed | Placement and chain | Outcome |
|---|---|---|---|
| `firebase` | 12.19.0 | Direct production dependency inheriting Firestore/compat findings | Retained |
| `@firebase/firestore` | 4.17.2 | Transitive, `firebase → @firebase/firestore → @grpc/grpc-js` | Retained |
| `@firebase/firestore-compat` | 0.4.14 | Transitive, `firebase → @firebase/firestore-compat → @firebase/firestore → @grpc/grpc-js`. Application imports use modular Firestore. | Retained |
| `@grpc/grpc-js` | 1.9.16 | Transitive production-classified Node dependency | Retained |
| `expo` | 58.0.26 | Direct production dependency inheriting the fingerprint finding | Retained |
| `@expo/fingerprint` | 0.21.10 | Transitive, `expo → @expo/fingerprint → minimatch`. Node build tooling. | Retained |
| `minimatch` | 8.0.7 and 10.2.6 | Transitive development copy via glob and production-classified tooling copy via fingerprint | 8.0.7 removed. 10.2.6 remains. |
| `babel-plugin-module-resolver` | 5.0.3 | Direct development dependency inheriting the glob finding | Removed |
| `glob` | 9.3.5 | Transitive development dependency via the Babel plugin | Removed |

The registry's latest Firebase 12 is the installed 12.19.0. Its Firestore pins gRPC to `~1.9.0`. The registry's current Firebase 13.4.0 selects Firestore 4.20.0, which still declares the same gRPC constraint. A patched gRPC version is outside that declared range. Expo 58.0.26 already resolves the latest fingerprint 0.21.10 available in the registry, which declares `minimatch@^10.2.6`. Minimatch 11.0.1 is outside that range. Changing either range via override would bypass an upstream constraint. Expo, React Native, Expo Router and Firebase versions remain unchanged.

There is confirmed vulnerable package presence in the production-classified install tree. Source review found no application-owned gRPC server, auth-context consumer, or server runtime for the static Web deployment. Installed Firestore's Node entry imports gRPC. Its browser and React Native entry points use separate implementations. For Expo fingerprint, the match call sites operate on project and build configuration in Node. npm's production classification reflects how the packages are installed. It does not establish reachability from application users or independently verify a deployed service.

## Change and verification

- Removed `babel-plugin-module-resolver` from the manifest and its 18 orphaned entries from the lockfile. No retained lockfile entry changed. Babel retains `babel-preset-expo`. Existing `@/*` aliases use Expo's stock Metro support and the unchanged TS path mapping. [Expo TypeScript path aliases](https://docs.expo.dev/guides/typescript/#path-aliases-optional)
- The working tree's account UI already called `StyleSheet.flatten`. The initial suite exposed a missing method in the isolated React Native test mock. Added that method to the fixture and kept the assertions, 60-test count and application code intact.
- npm manifest/lock reconciliation and installed direct-dependency validation passed. Expo `install --check` reported dependencies up to date in offline mode, with Expo's offline reliability caveat.

- TypeScript completed with zero errors, ESLint with zero errors and warnings, and all 60 tests passed. `git diff --check` passed.
- A clean-cache Expo export with source maps succeeded for Web, iOS and Android. Web emitted static routes, and the native targets emitted Hermes bundles. The extracted source paths from 35 Web client maps and both native maps contained no gRPC JS or Expo fingerprint modules. Web mapped modular Firestore to its ESM entry, and iOS and Android mapped it to its React Native entry. Web prerendering also succeeded. These checks do not cover native compilation, signing, devices or deployed infrastructure.

## Remaining work

1. Track a Firebase release whose Firestore declares a gRPC range containing a maintainer-patched version. When available and compatible with the current Expo SDK, validate client export resolution and the Node Firestore path independently.
2. Track Expo fingerprint for a compatible patched minimatch dependency or an upstream backport. Retain a record of the current optimization-level analysis and check it again if fingerprint configuration, usage or dependencies change.
3. Keep full and production-only registry scans in release validation. Review production classification alongside actual runtime and build paths, then repeat clean dependency installation and staging validation before submission.

No dependency overrides or framework upgrades were used. There were no application behavior, production data, rule, or deployment changes.
