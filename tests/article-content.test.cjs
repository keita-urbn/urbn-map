const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reorder, removeImageReferences, safeBlocks } = require('../lib/articleContent.ts');
const { mapInfoArticle } = require('../lib/infoArticles.ts');
test('text/image ordering and image removal preserve other text and references', () => {
  const blocks = [{ id: 't1', type: 'text', text: 'Japanese\nEnglish' }, { id: 'i1', type: 'image', imageId: 'image', access: 'premium' }, { id: 't2', type: 'text', text: 'after' }];
  assert.deepEqual(reorder(blocks, 1, 1).map(b => b.id), ['t1', 't2', 'i1']);
  assert.deepEqual(removeImageReferences(blocks, 'image').map(b => b.id), ['t1', 't2']);
  assert.equal(safeBlocks(blocks)[0].text, blocks[0].text);
});
test('public article mapping excludes legacy body when requested and rejects private image blocks', () => {
  const a = mapInfoArticle('id', 'info_shop', { title: 'old', body: 'protected legacy', publicBlocks: [{ id: 'bad', type: 'image', imageId: 'private', access: 'premium' }], publicImages: [{ id: 'private', path: 'private-path', access: 'premium', width: 10, height: 10 }] }, false);
  assert.equal(a.body, ''); assert.deepEqual(a.publicImages, []); assert.deepEqual(a.publicBlocks, []);
  assert.equal(mapInfoArticle('id', 'info_shop', { body: 'legacy' }).body, 'legacy');
});
