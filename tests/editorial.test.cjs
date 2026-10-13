const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');
const fs = require('node:fs');
const moduleFixture = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('components/ShopEditorial.tsx', 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(code, { module: moduleFixture, exports: moduleFixture.exports, require: () => ({}) });
const sections = input => JSON.parse(JSON.stringify(moduleFixture.exports.editorialSections(input)));
test('editorial supports legacy, empty and partially populated shops without fabricated content', () => {
  assert.deepEqual(sections({}), []);
  assert.deepEqual(sections({ comment: ' original\nJapanese ' }), [{ title: 'OVERVIEW', text: 'original\nJapanese' }]);
  assert.deepEqual(sections({ theSelection: ' clothing ' }), [{ title: 'THE SELECTION', text: 'clothing' }]);
});
test('all editorial fields retain multiline content and legacy description without duplicates', () => {
  assert.deepEqual(sections({ theVibe: ' calm ', theSelection: 'brands\nstyles', theExperience: 'visit', comment: 'calm' }).map(s => s.title), ['THE VIBE', 'THE SELECTION', 'THE EXPERIENCE']);
  assert.equal(sections({ theVibe: 'calm', comment: 'different legacy detail' })[1].title, 'ABOUT');
});
