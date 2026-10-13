# Confirmed weekly hours seed

Script: scripts/seed-business-hours.cjs. Reads existing shops in project
urbn-map-5ef26, default Firestore database. The project ID is taken from lib/firebase.ts.
Uses existing TypeScript validation by transpiling lib/businessHours.ts in Node;
no application dependencies, schema or UI were changed.

Editor-compatible schema:

    businessHours: {
      timezone: 'Asia/Tokyo',
      weekly: {
        mon: { closed: false, intervals: [{ open: '12:00', close: '20:00' }] },
        // tue, wed, thu, fri, sat, sun use the same structure
      }
    }

Closed = { closed: true, intervals: [] }. Unset = missing weekly day key.
Entire hours absent/null = unknown. Times are HH:mm strings; multi-interval and
cross-midnight schedules are supported by existing helpers. No monthly exceptions
exist in the current schema. Addition Adelaide's first-Wednesday exception is not
encoded as weekly closed.

Admin Edit loads businessHours via getShopById -> mapShop, defaults missing hours
to null, edits BusinessHoursEditor and validates before updateShop. The CRUD helper
validates again. Types BusinessHours/DayHours/HoursInterval/Weekday and helpers
WEEKDAYS, validDay, validateBusinessHours, minutes, getOpeningStatus,
formatDayHours/todayHoursText already exist in lib/businessHours.ts.

    node scripts/seed-business-hours.cjs --dry-run

Default with no flags is also dry-run. Name matching normalizes case, whitespace,
width and typographic apostrophes, but never performs fuzzy matching. Multiple
matches are skipped. STUDIOUS requires explicit Shibuya and PARCO evidence in the
name/address/area (PARCO must appear in name/address). ALLU Tokyo, Additon Aderaide,
and Dover Street Market are not silently assumed to match differing confirmed
names. Existing equal hours are no-op; unlisted records stay untouched. Unexpected
existing hours extension metadata/timezones require manual review.

Full live read-only output is business-hours-seed-dry-run.txt. Review it first.
After review, supply an authorized Firebase admin ID token or Google OAuth access
token in URBN_FIRESTORE_TOKEN through your shell's secure environment mechanism.
Do not commit tokens or paste them into shared command logs. Then run exactly:

    node scripts/seed-business-hours.cjs --apply

If using preconfigured gcloud operator credentials, an authorized OAuth token may
be obtained with `gcloud auth print-access-token` and placed in that environment
variable. The script does not extract credentials from the mobile app.

Apply re-reads shops and prints its plan before a single atomic REST commit.
Each write masks ONLY businessHours, with an updateTime precondition. A concurrent
manual change aborts the entire commit. No documents are created and not even
updatedAt is changed. Missing/invalid credentials fail rather than bypassing rules.
No apply was executed. Existing records already matching the supplied schedules
remain unchanged. All other fields and all unmatched records are untouched.

Checks: four seeding regression tests cover schema, normal vs irregular closures,
ambiguous matches, equal-data no-ops, timezone preservation, and dry-run-only GETs.
Project TypeScript check retains five unrelated pre-existing errors.
