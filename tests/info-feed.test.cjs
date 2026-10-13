const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapInfoArticle, filterInfoArticles } = require('../lib/infoArticles.ts');
test('merges legacy collections without losing duplicate IDs, fields or publication order', () => {
  const a = mapInfoArticle('same', 'info_shop', { title: 'old', abstract: 'complete', body: 'locked', createdAt: { toMillis: () => 100 } });
  const b = mapInfoArticle('same', 'info_event', { title: 'event', createdAt: 200 });
  const legacy = mapInfoArticle('legacy', 'posts', { title: 'old posts', createdAt: 50 });
  const filtered = filterInfoArticles([a, legacy, b], 'all', '', 1000);
  assert.deepEqual(filtered.map(p => p.source), ['info_event', 'info_shop', 'posts']);
  assert.equal(a.abstract, 'complete'); assert.equal(a.body, 'locked');
});
test('category and title/tag search combine, unpublished/future records remain out of public feed', () => {
  const records = [mapInfoArticle('a', 'info_size', { title: 'Size Guide', hashtags: ['#denim'], createdAt: 100 }), mapInfoArticle('b', 'info_event', { title: 'hidden', published: false }), mapInfoArticle('c', 'info_shop', { title: 'future', publishedAt: 5000 })];
  assert.equal(filterInfoArticles(records, 'size', 'DENIM', 1000).length, 1);
  assert.equal(filterInfoArticles(records, 'shop', 'denim', 1000).length, 0);
  assert.equal(filterInfoArticles(records, 'all', '', 1000).length, 1);
});
