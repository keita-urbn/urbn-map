// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['scripts/seed-business-hours.cjs'],
    languageOptions: { globals: { __dirname: 'readonly' } },
  },
  {
    // This standalone migration resolves the Admin SDK only in its operator environment.
    files: ['scripts/admin/migrations/backfill-favorite-counts.mjs'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^firebase-admin/(app|firestore)$'] }] },
  },
  {
    ignores: ['dist/*'],
  },
]);
