/** Admin-only migration. Dry-run by default; run with --apply after backup/rule review.
 * Requires firebase-admin in the operator environment and trusted ADC credentials.
 * No production credentials or service-account keys belong in this repository.
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp({ credential: applicationDefault() });
const db = getFirestore();
const sources = ['info_shop', 'info_event', 'info_size', 'info_trend', 'posts'];
(async () => {
  for (const source of sources) {
    const snapshot = await db.collection(source).get();
    for (const record of snapshot.docs) {
      const data = record.data();
      if (data.contentVersion === 2) continue;
      const privateRef = record.ref.collection('private').doc('content');
      // Never overwrite an existing private body silently.
      if ((await privateRef.get()).exists) throw new Error(`Private document already exists: ${record.ref.path}`);
      console.log(`${process.argv.includes('--apply') ? 'Migrating' : 'Would migrate'} ${record.ref.path}`);
      if (!process.argv.includes('--apply')) continue;
      await db.runTransaction(async tx => {
        const current = await tx.get(record.ref); const existing = await tx.get(privateRef);
        if (current.data()?.contentVersion === 2) return;
        if (existing.exists) throw new Error('Private document appeared concurrently; aborting');
        const body = current.data()?.body ?? '';
        tx.set(privateRef, { body, bodyBlocks: body ? [{ id: 'legacy-body', type: 'text', text: body }] : [], premiumImages: [] });
        tx.update(record.ref, { contentVersion: 2, body: FieldValue.delete(), publicBlocks: [], publicImages: [], publicGalleryImageIds: [] });
      });
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
