# Registered Google Maps links

Optional Firestore shop field: `googleMapsUrl` (string). Add Shop omits blanks;
Edit Shop loads the saved string, replaces valid URLs, and writes an empty string
only when clearing an existing value. No migration or generated URLs. Shop name,
address and coordinates are unchanged. Existing deployed rules must allow this
optional field if they enforce a shop-field allowlist; no rules were deployed.

Validation uses URL parsing, HTTPS, no credentials/custom ports, and exact hosts:
google.com/www.google.com and google.co.jp/www.google.co.jp with /maps paths;
maps.google.com/maps.google.co.jp; maps.app.goo.gl with a sharing token;
goo.gl/maps/{token}. Unsupported country domains must be added explicitly after
verification. Accepted strings retain their original legitimate query parameters.
Invalid saved URLs are ignored at navigation time; forms reject new invalid input.

Search/Open uses the registered link unchanged. Directions construct Google's
universal /maps/dir/?api=1 URL using destination/query/q and optional
 destination_place_id/query_place_id, or explicit !3d/!4d place coordinates.
The requested walking/driving mode is always set. Camera @ coordinates and an
ambiguous place-name path are not treated as authoritative destinations.
Reference: https://developers.google.com/maps/documentation/urls/get-started

Opaque short links are not fetched or followed in-app (web CORS/redirect parsing
is not a reliable destination resolver). Their Search/Open action still uses the
registered link. Directions explain this limitation before using the exact legacy
name/address/coordinate resolver, requesting the selected mode. Users should
confirm the destination in Google Maps. A resolved Place ID is preferred for
same-name branches; unresolved links cannot guarantee branch identity for routing.
A rejected registered link opens only the legacy fallback; final failure reports
feedback. Successful registered opens do not also launch the fallback. Existing
Premium checks, usage accounting and route-click metrics remain in the shared guard.

One confirmed legacy bug was corrected: Android google.navigation now includes
mode=w for walking and mode=d for driving (transit uses the universal URL).
iOS legacy schemes and legacy search/direction destination strings are unchanged.

Local regression tests cover trusted/hostile URLs, Place ID branch identity,
walking/driving construction, coordinate vs camera handling, optional/clear field
payloads, opaque-link fallback and failed-open single fallback. Manual acceptance
still requires Add/Edit/save/reopen against Firestore, iOS and Android with/without
the Maps app, short-link resolution in Maps, popup settings on web, and same-name
branch confirmation. No live Firestore write or physical-device linking was run.

Files: lib/googleMapsUrl.ts, types/shop.ts, lib/shops.ts, hooks/useShops.ts,
app/admin/add-shop.tsx, app/admin/edit-shop/[id].tsx, hooks/useRouteGuard.ts,
components/ShopDetailContent.tsx, tests/google-maps-url.test.cjs, this document.
