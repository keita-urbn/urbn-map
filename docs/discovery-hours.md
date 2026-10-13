# Shop hours and related discovery

The optional `shops/{id}.businessHours` field uses this shape:

```json
{
  "timezone": "Asia/Tokyo",
  "weekly": {
    "mon": { "closed": false, "intervals": [{ "open": "11:00", "close": "19:00" }] },
    "tue": { "closed": true, "intervals": [] }
  }
}
```

Keys are `mon` through `sun`. Missing days, absent/null hours, malformed schedules and invalid timezones are unknown rather than closed. Clearing hours saves null. New Tokyo schedules default to Asia/Tokyo; administrators can enter another IANA timezone. The interval array already supports split shifts; Add/Edit preserve and expose all existing intervals. No automatic 24-hour or holiday schedule is inferred.

Times are HH:mm (00:00–23:59). Equal opening and closing times are rejected as ambiguous. A closing time earlier than opening continues into the next day. Local time is calculated with Intl.DateTimeFormat, including the configured timezone's DST rules. Opening is inclusive, closing exclusive. Yesterday's overnight spill is checked first, including Sunday/Monday rollover. Otherwise today's known schedule determines status; missing today remains unknown. A closed day does not cancel yesterday's still-running overnight interval.

Map statuses are calculated once per shop per clock tick and shared with markers and the existing search filter. The clock refreshes every 30 seconds and when the app resumes. Open Now starts off and admits only open shops. Selected-marker styling is independent of the colored border. The expanded detail shows today's schedule and an expandable week. Existing Firestore CRUD validates hours before writing and retains the existing permission/security configuration.

Related shops use existing metadata: identical genre +100; shared genre tokens +50; shared brands +20 per unique brand, max +60; identical area +10; within 3km +5. ID breaks score ties; zero scores are omitted. Multiword brand names are matched whole, case-insensitively. Current shop, duplicate IDs, blank IDs/names, invalid coordinates and deleted records are excluded. There is no active/inactive flag in the current model: shops are hard-deleted, so the existing live query is the available-record source. No lifecycle field or fictional metadata was introduced. The ranker is independent of UI and can accept future behavior-based signals later.

The map supplies its existing shop dataset to recommendations. Selecting one updates the same sheet and clears discovery filters so the recommended shop remains visible even if it is closed. Standalone shop routes replace their route rather than stacking another detail screen.

Existing shops need administrators to enter business hours manually through Edit Shop. No shop hours were guessed or bulk-populated, and no production database writes were performed for validation.

Checks: `node --test tests/discovery.test.cjs` covers local time, boundaries, closed days, missing/malformed schedules, overnight rollover, split shifts, payload round-trip, recommendations and exclusion rules. Live Firebase save/load permissions and touch/scroll/native-marker appearance require running the app against the intended environment.

## Changed files for this refinement

- `types/shop.ts`, `hooks/useShops.ts`: optional hours field, Firestore mapping and write validation.
- `lib/businessHours.ts`, `hooks/useBusinessClock.ts`: shared status, timezone, validation, display helpers and refresh cadence.
- `components/BusinessHoursEditor.tsx`, `app/admin/add-shop.tsx`, `app/admin/edit-shop/[id].tsx`: weekly hours editing, loading, clearing and persistence.
- `components/BusinessHoursSection.tsx`, `components/ShopDetailContent.tsx`, `components/ShopSheet.tsx`: weekly display and shared related-shop selection.
- `app/(tabs)/index.tsx`, `components/ShopMap.native.tsx`, `components/ShopMap.web.tsx`: Open Now discovery and status accents.
- `lib/relatedShops.ts`, `components/RelatedShopsCarousel.tsx`: deterministic relevance and horizontal discovery.
- `theme/colors.ts`, `assets/textures/black-metal.svg`: brighter charcoal material and translucent surfaces without grain/stripes.
- `tests/discovery.test.cjs`: domain regression tests.
- `docs/discovery-hours.md`: schema, ranking, migration and validation notes.
