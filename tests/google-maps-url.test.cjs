const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, mocks = {}, suffix = '') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8') + suffix, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL, window: { alert() {} }, console, require: key => mocks[key] ?? require(key) });
  return exports;
}
const urls = load('lib/googleMapsUrl.ts');
const legacy = load('lib/mapsDestination.ts');
test('trusted Maps formats retain parameters and reject lookalikes, credentials and malformed links', () => {
  for (const value of ['https://www.google.com/maps/place/Shop?foo=x&hl=ja', 'https://maps.google.com/?q=Tokyo', 'https://maps.app.goo.gl/ABC?g_st=ic', 'https://goo.gl/maps/ABC', 'https://www.google.co.jp/maps/place/Shop']) assert.equal(urls.validGoogleMapsUrl(value), value);
  for (const value of [null, {}, '', 'garbage', 'javascript:alert(1)', 'https://google.com.evil.test/maps', 'https://evil.test/google.com/maps', 'https://user@google.com/maps', 'https://www.google.com/search?q=maps', 'https://maps.app.goo.gl/', 'http://maps.google.com/?q=x']) assert.equal(urls.validGoogleMapsUrl(value), undefined);
});
test('explicit destinations and Place IDs preserve walking/driving and branch identity', () => {
  for (const mode of ['walking','driving']) {
    const url = new URL(urls.registeredDirectionsUrl('https://www.google.com/maps/search/?api=1&query=Same+Name&query_place_id=branch-2', mode));
    assert.equal(url.searchParams.get('destination_place_id'), 'branch-2');
    assert.equal(url.searchParams.get('destination'), 'Same Name');
    assert.equal(url.searchParams.get('travelmode'), mode);
  }
  assert.equal(new URL(urls.registeredDirectionsUrl('https://www.google.com/maps/place/Shop/data=!3d35.7!4d139.7', 'walking')).searchParams.get('destination'), '35.7,139.7');
  for (const link of ['https://maps.app.goo.gl/ABC', 'https://www.google.com/maps/place/Shop/@35,139,16z', 'invalid']) assert.equal(urls.registeredDirectionsUrl(link, 'walking'), undefined);
});
test('optional field omits absent values, accepts replacement and deliberately clears; legacy resolution unchanged', () => {
  assert.deepEqual({ ...urls.googleMapsUrlField(undefined) }, {});
  assert.deepEqual({ ...urls.googleMapsUrlField(' ') }, { googleMapsUrl: '' });
  assert.equal(urls.googleMapsUrlField(' https://maps.app.goo.gl/NEW ').googleMapsUrl, 'https://maps.app.goo.gl/NEW');
  assert.throws(() => urls.googleMapsUrlField('https://evil.test/maps'));
  assert.equal(legacy.getMapsDestination({name:'Shop',address:'Address',lat:35,lng:139}), 'Shop, Address');
});
test('registered failures fall back once; opaque directions keep legacy destination and Android walking mode', async () => {
  const opened = []; let fail = true;
  const h = load('hooks/useRouteGuard.ts', {
    '../lib/googleMapsUrl': urls, '../lib/mapsDestination': legacy, '../lib/shopMetrics': {}, '../lib/usageLimits': {}, '../context/auth': {}, 'expo-router': {}, react: {},
    'react-native': { Platform: { OS:'android' }, Alert:{ alert: (_title,_msg,buttons) => buttons[0].onPress() }, Linking:{canOpenURL:async()=>true,openURL:async url => {opened.push(url); if(fail){fail=false;throw Error('failed');}} } }
  }, '\nexport { shopDirections, registeredAction };');
  await h.registeredAction('https://maps.app.goo.gl/ABC', async()=>opened.push('legacy'));
  assert.deepEqual(opened, ['https://maps.app.goo.gl/ABC','legacy']);
  opened.length=0;
  await h.shopDirections('Shop, Address', 'walking', 'https://maps.app.goo.gl/ABC');
  assert.deepEqual(opened, ['google.navigation:q=Shop%2C%20Address&mode=w']);
  opened.length=0;
  await h.shopDirections('Wrong branch', 'driving', 'https://maps.google.com/?q=35,139');
  assert.equal(new URL(opened[0]).searchParams.get('destination'), '35,139');
  assert.equal(new URL(opened[0]).searchParams.get('travelmode'), 'driving');
});
