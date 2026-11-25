# URBn App Store implementation plan

**Founder approval required before implementation.** Use [the audit](APP_STORE_READINESS_AUDIT.md) for evidence and effort ranges and [the checklist](APP_STORE_RELEASE_CHECKLIST.md) for sign-off.

## Shortest safe release path

Approve Scenario B, preserve free discovery and remove simulated purchase, restore, billing copy and paid upsells. Decide whether reviews ship with full moderation or are excluded from the launch scope. Keep the current design and validate impacted native and web surfaces. Scenario A adds billing and entitlement work before release-candidate freeze.

| Stage | Dependency | Work and exit evidence |
|---|---|---|
| 0 · Product and access | Founder approval | Select A/B, markets, content, iPad and reviews. Assign named owners. Secure read-only rules/config exports and staging access. Confirm Apple team, bundle ID and build pipeline access. |
| 1 · Rules and contracts | Stage 0 | Map existing data and live rule versions. Design trusted roles, protected user data, review lifecycle and public/private article boundaries. Define deletion and retention contracts. In parallel draft policies, inventory rights and prepare a signed staging build profile. |
| 2 · Common implementation | Stage 1 interfaces | Implement deletion, privacy/support, admin guard and review safety or approved exclusion. Remove simulated billing. Build migration, reconciliation and complete rules. Validate types and critical lint behavior while the packaging lane verifies native modules and privacy metadata. |
| 3 · Staging integration | App/backend/rules implemented | Run mock/unit, emulator and staging contract tests. Rehearse migration and recovery, compare counters, confirm direct media access after removal and conduct moderation/deletion drills. Run sandbox billing matrix for A. |
| 4 · Production prep and release candidate | Staging pass, approved migration/deployment | Execute owner-approved migration and rules procedure. Verify version parity, backend availability and demo access. Build signed production candidate and run TestFlight device matrix. Perform only approved production checks. |
| 5 · Listing and submission approval | Signed candidate passes | Finalize App Privacy, age rating, exports, localized screenshots and review notes. Close all required checklist items and obtain founder approval to submit. |

## Workstreams and handoffs

| Workstream | Owner role | Scope and handoff |
|---|---|---|
| Application code | Mobile | P0-01/02/03/06. Account deletion and reauth, support/policy links, review controls, removal of simulated billing, guest navigation and clear permission/failure states. Supply signed build QA walkthrough. |
| Backend | Backend | P0-01/02/05/08 and P1-01/02. Idempotent deletion jobs and data reconciliation, content review and private uploads, safe publication migration and optional billing event handling. Supply staging results and rollback procedures. |
| Firebase security | Firebase owner | P0-04/05 and P1-01/04. Export and reconcile complete rules/indexes/IAM, trusted roles and media access, migrate legacy data and verify staging authorization. Record change window and parity after separately approved production rollout. |
| Native build | Release engineer | P0-06/07 and P1-03/05. Configure identifiers, signing, environment, release profiles, package compatibility, native privacy and version numbering. Deliver an inspected archive for TestFlight. |
| App Store Connect | Account holder/release | P0-07/08/09. Establish agreements and app record, release metadata, reviewer account/notes and screenshots. Prepare products and sandbox for A. Handle upload and review only after appropriate approval. |
| Legal and operations | Founder/privacy/support | P0-02/06/09 and P1-04/06. Rights and provider terms, privacy inventory and retention, UGC staffing, support/contact, territories, regional declarations and export. Deliver approved records and live URLs. |
| Manual device testing | Mobile QA | P0-07 and P1-05. Execute signed-build matrix on actual supported devices with release-like data. Validate admin in staging and exercise all reviewer-facing paths. Record build, OS, device, scenarios and defects. |

## Sequencing and recovery

- Establish the secure replacement for client-written roles and entitlements before enabling reviewed data paths on production. Account for older beta and web clients before enforcing breaking rules.
- For articles, rehearse migration and public-data verification before cutover. Snapshot and record inputs in the approved environment. Prefer a rollback that preserves private-data restrictions.
- Treat system-level authorization, deletion/media cleanup, review safety, native compatibility and successful reviewer login as independent release gates. A successful local suite does not close any of these gates.
- Schedule App Store account setup, policy drafting and rights clearance in parallel with staging. Take screenshots after the signed UI and launch scope are stable.
- For A, add about 10–18 engineering person-days for the billing workstream, versus 2–4 for B scope cleanup. These ranges exclude shared work and external approvals. Product setup and sandbox can run alongside common backend work once bundle and account identity are fixed. Billing completion is on the critical path for A.
- For B, lock the approved free article catalog and behavior early. Remove paid prompts across direct routes, account, reviews-related contexts where applicable, favorites, maps and editorial. Validate that old client grants cannot affect release authorization.
