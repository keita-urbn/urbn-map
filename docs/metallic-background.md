# Exact metallic background integration

Original: /Users/monmakeita/Downloads/IMG_4071.JPG
Bundled, byte-identical asset: assets/textures/black-metal.jpg
SHA-256: 2221ef2fc5907d858bfc1a8bb0a2ddd5c3bc2c742114b48009c6c0765945a7c8

Root cause: the supplied image was absent. MetallicBackground previously referenced
an unrelated SVG gradient and used fill scaling. It now uses the original local
JPEG through Expo Image, with cover, absolute-fill placement, full opacity,
no blur/overlay, and pointerEvents=none. Light mode retains its readable existing
palette. Cover preserves aspect ratio and may crop edges on differing screen ratios.

Search (including loading), Favorites, Information/Trending, article details and
Account (signed in, entrance, login) already mount the shared layer before their
scroll content. Their opaque root colors are below, not above, that layer.
No change to those screen containers was needed. Cards retain their existing
charcoal colors/opacity.

Additional mounts: Premium/loading, Notifications/list/composer, Signup, saved-shop
list/loading, legacy Posts, article Admin/editor/access-denied, Add Shop, Edit Shop
and README. Edit Shop and README now put the scroll content inside a fixed root
background wrapper. Add Shop's inner scroll container is transparent; its outer
page remains the theme base. Shared store surfaces also inherit the exact image
through their existing MetallicBackground calls. Map screen/controls/tiles/markers,
notification state, bottom-sheet gestures and floating navigation were not edited.

Changed source files: components/MetallicBackground.tsx, app/premium.tsx,
app/notifications.tsx, app/signup.tsx, app/favorites/list.tsx, app/posts/index.tsx,
app/admin/add-post.tsx, app/admin/add-shop.tsx, app/admin/edit-shop/[id].tsx,
app/readme.tsx. Added the JPEG and this document. No asset generation or cloud
requests are involved.

Verification: source checksum matches, all 26 existing tests pass, and targeted
lint passes for the background and screens without existing lint failures.
Whole-project checks retain five existing TypeScript errors and 31 lint errors
plus one warning. Physical iOS/Android and browser appearance/interaction were not
visually verified. Check Search, Favorites, Information and all Account states;
scroll to the last item, tap buttons, rotate/resize, and verify image coverage and
contrast. Navigation headers on secondary pages keep their existing opaque styling.
If an existing Metro session continues showing the SVG after reload, restart it
with `npx expo start --clear`; no cache issue was observed or claimed.
