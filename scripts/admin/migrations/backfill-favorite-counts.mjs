#!/usr/bin/env node
/**
 * One-time closed-beta migration for shops.favoriteCount.
 * Run during a short maintenance window when testers are not changing
 * favorites, otherwise writes occurring during the scan may be missed.
 *
 * Install the admin SDK locally without changing package.json/package-lock.json:
 *   npm install --no-save --package-lock=false firebase-admin
 *
 * Dry run (default):
 *   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json \
 *   GOOGLE_CLOUD_PROJECT=urbn-map-5ef26 \
 *   node scripts/admin/migrations/backfill-favorite-counts.mjs
 *
 * Apply after reviewing the dry-run totals:
 *   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json \
 *   GOOGLE_CLOUD_PROJECT=urbn-map-5ef26 \
 *   node scripts/admin/migrations/backfill-favorite-counts.mjs --apply
 *
 * Credentials stay outside the repository and are never bundled into the app.
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");
const projectId = process.env.GOOGLE_CLOUD_PROJECT;

if (!projectId) {
  throw new Error("GOOGLE_CLOUD_PROJECT is required");
}

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

const [shopsSnapshot, favoritesSnapshot] = await Promise.all([
  db.collection("shops").get(),
  db.collectionGroup("favorites").get(),
]);

const counts = new Map();
for (const favorite of favoritesSnapshot.docs) {
  // Expected path: users/{uid}/favorites/{shopId}
  const segments = favorite.ref.path.split("/");
  if (segments.length !== 4 || segments[0] !== "users" || segments[2] !== "favorites") {
    console.warn(`Skipping unexpected favorite path: ${favorite.ref.path}`);
    continue;
  }
  const shopId = segments[3];
  counts.set(shopId, (counts.get(shopId) ?? 0) + 1);
}

console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
console.log(`Shops: ${shopsSnapshot.size}`);
console.log(`Favorites counted: ${favoritesSnapshot.size}`);
for (const shop of shopsSnapshot.docs) {
  console.log(`${shop.id}: ${counts.get(shop.id) ?? 0}`);
}

if (!apply) {
  console.log("No writes performed. Re-run with --apply after reviewing the totals.");
  process.exit(0);
}

const writer = db.bulkWriter();
for (const shop of shopsSnapshot.docs) {
  writer.update(shop.ref, { favoriteCount: counts.get(shop.id) ?? 0 });
}
await writer.close();
console.log(`Updated favoriteCount on ${shopsSnapshot.size} shop documents.`);
