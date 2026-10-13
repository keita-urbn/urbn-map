const { test } = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const vm = require('node:vm'); const ts = require('typescript');
const content = require('../lib/articleContent.ts');
function load(dependencies) {
  const fixture = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/articlePersistence.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module: fixture, exports: fixture.exports, require: name => dependencies[name] }); return fixture.exports;
}
const old = { id: 'old', path: 'articles/info_shop/id/public/old.jpg', access: 'public', width: 100, height: 100 };
function harness(fail = false) {
  const writes = []; const deleted = [];
  const firebase = { collection: (_db, source) => ({ source }), doc: (...args) => ({ path: args.length === 1 ? 'info_shop/id' : args.slice(1).join('/'), id: 'id' }), deleteField: () => 'DELETE', serverTimestamp: () => 'TIME', writeBatch: () => ({ update: (ref, data) => writes.push({ path: ref.path, data, operation: 'update' }), set: (ref, data) => writes.push({ path: ref.path, data, operation: 'set' }), commit: async () => { if (fail) throw new Error('denied'); } }) };
  return { writes, deleted, api: load({ 'firebase/firestore': firebase, './firebase': { db: {} }, './articleContent': content, './articleStorage': { uploadArticleImage: async (_source, _id, access) => ({ ...old, id: 'uploaded', path: `articles/info_shop/id/${access}/new.jpg`, access }), deleteArticleImage: async (_source, _id, image) => deleted.push(image.path) } }) };
}
const input = { source: 'info_shop', id: 'id', kind: 'shop', title: 'title', hashtags: [], abstract: 'public', body: 'secret', publicBlocks: [], bodyBlocks: [{ id: 'b', type: 'image', imageId: 'new', access: 'public' }], images: [{ ...old, id: 'new', uri: 'local' }], previousImages: [old] };
test('atomic save separates Premium body, keeps body-only public image out of gallery, cleans old file after commit', async () => {
  const h = harness(); const result = await h.api.saveArticle(input);
  const publicWrite = h.writes.find(w => w.operation === 'update');
  const privateWrite = h.writes.find(w => w.path.endsWith('private/content'));
  assert.equal(publicWrite.data.body, 'DELETE'); assert.equal(privateWrite.data.body, 'secret');
  assert.equal(publicWrite.data.publicGalleryImageIds.length, 0); assert.equal(publicWrite.data.premiumImages, undefined);
  assert.equal(result.images[0].id, 'new'); assert.deepEqual(h.deleted, [old.path]);
});
test('failed commit cleans only new uploads and preserves original image; new article never sets a delete sentinel', async () => {
  const h = harness(true); await assert.rejects(h.api.saveArticle(input)); assert.equal(h.deleted.length, 1); assert.ok(h.deleted[0].endsWith('/new.jpg'));
  const create = harness(); await create.api.saveArticle({ ...input, id: undefined });
  const publicWrite = create.writes.find(w => !w.path.endsWith('private/content'));
  assert.equal(publicWrite.data.body, undefined);
});
