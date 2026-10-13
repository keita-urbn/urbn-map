const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rankMarkers, placeMarkers } = require('../lib/markerPriority.ts');
const { cropGeometry } = require('../lib/iconCrop.ts');
const shop = (id, favorites = 0, routes = 0, rating = 0, reviews = 0) => ({ id, name: id, lat: 35, lng: 139, favoriteCount: favorites, routeClickCount: routes, ratingAverage: rating, ratingCount: reviews });
test('zero, sparse and tied engagement never create artificial high tiers', () => {
  for (const list of [[shop('a')], [shop('a', 2)], [shop('a', 2), shop('b', 2), shop('c', 2)]]) assert.ok(Object.values(rankMarkers(list)).every(p => p.tier === 'low'));
});
test('engagement tiers and review confidence are deterministic', () => {
  const ranks = rankMarkers([shop('a'), shop('b', 1), shop('c', 5, 5), shop('d', 10, 10, 5, 50)]);
  assert.equal(ranks.a.tier, 'low'); assert.equal(ranks.c.tier, 'medium'); assert.equal(ranks.d.tier, 'high');
  const ratings = rankMarkers([shop('few', 0, 0, 5, 1), shop('many', 0, 0, 4, 50)]);
  assert.ok(ratings.many.score > ratings.few.score);
});
test('selected marker wins collision and zoom gates labels', () => {
  const shops = [shop('a', 10), shop('b')];
  const p = shops.map(s => ({ shop: s, x: 100, y: 100 }));
  assert.equal(placeMarkers(p, rankMarkers(shops), 12)[0].shop.id, 'a');
  assert.equal(placeMarkers(p, rankMarkers(shops), 15, 'b')[0].shop.id, 'b');
  assert.equal(placeMarkers(p, rankMarkers(shops), 12)[0].label, false);
});
test('crop matches preview coordinates and never exposes empty edges', () => {
  const g = cropGeometry(1000, 500, 250, 2, 9999, -9999);
  assert.equal(g.crop.width, 250); assert.equal(g.crop.originX, 0); assert.equal(g.crop.originY, 250);
  const centered = cropGeometry(1000, 500, 250, 1, 0, 0);
  assert.equal(centered.crop.originX, 250); assert.equal(centered.crop.width, 500);
});
