const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getOpeningStatus, WEEKDAYS, validateBusinessHours, formatDayHours, todayHoursText } = require('../lib/businessHours.ts');
const { relatedShops } = require('../lib/relatedShops.ts');
const closed = { closed: true, intervals: [] };
const open = (start, end) => ({ closed: false, intervals: [{ open: start, close: end }] });
const schedule = (weekly, timezone = 'Asia/Tokyo') => ({ timezone, weekly: Object.fromEntries(WEEKDAYS.map(day => [day, weekly[day] ?? closed])) });
const at = text => new Date(text);
test('missing or malformed hours remain unknown', () => {
  for (const value of [undefined, null, { timezone: 'Asia/Tokyo', weekly: {} }, { timezone: 'Bad/Zone', weekly: { mon: closed } }, { timezone: 'Asia/Tokyo', weekly: { mon: { closed: false, intervals: [null] } } }]) {
    assert.equal(getOpeningStatus(value, at('2026-10-12T01:00:00Z')), 'unknown');
  }
});
test('Tokyo opening inclusive, closing exclusive, known closed days', () => {
  const hours = schedule({ mon: open('10:00', '18:00') });
  assert.equal(getOpeningStatus(hours, at('2026-10-12T00:59:00Z')), 'closed');
  assert.equal(getOpeningStatus(hours, at('2026-10-12T01:00:00Z')), 'open');
  assert.equal(getOpeningStatus(hours, at('2026-10-12T08:59:00Z')), 'open');
  assert.equal(getOpeningStatus(hours, at('2026-10-12T09:00:00Z')), 'closed');
  assert.equal(getOpeningStatus(hours, at('2026-10-13T01:00:00Z')), 'closed');
});
test('overnight carry across midnight and weekly rollover', () => {
  const hours = schedule({ mon: open('22:00', '02:00'), sun: open('22:00', '02:00') });
  assert.equal(getOpeningStatus(hours, at('2026-10-12T13:00:00Z')), 'open');
  assert.equal(getOpeningStatus(hours, at('2026-10-12T16:00:00Z')), 'open');
  assert.equal(todayHoursText(hours, at('2026-10-12T16:00:00Z')), '前日から02:00まで営業');
  assert.equal(getOpeningStatus(hours, at('2026-10-12T17:00:00Z')), 'closed');
  assert.equal(getOpeningStatus(hours, at('2026-10-11T16:00:00Z')), 'open');
});
test('multiple intervals, unknown days and local timezone expansion', () => {
  const hours = schedule({ mon: { closed: false, intervals: [{ open: '09:00', close: '12:00' }, { open: '14:00', close: '18:00' }] } });
  assert.equal(getOpeningStatus(hours, at('2026-10-12T04:00:00Z')), 'closed');
  assert.equal(getOpeningStatus(hours, at('2026-10-12T05:00:00Z')), 'open');
  assert.equal(getOpeningStatus({ timezone: 'Asia/Tokyo', weekly: { sun: open('22:00', '02:00') } }, at('2026-10-11T16:00:00Z')), 'open');
  assert.equal(getOpeningStatus(schedule({ mon: open('10:00', '18:00') }, 'America/New_York'), at('2026-10-12T14:00:00Z')), 'open');
});
test('admin payload round-trip supports missing hours, closed days and invalid input', () => {
  assert.equal(validateBusinessHours(null), null);
  const hours = schedule({ mon: open('10:00', '18:00') });
  assert.equal(validateBusinessHours(JSON.parse(JSON.stringify(hours))), null);
  assert.ok(validateBusinessHours(schedule({ mon: open('25:00', '18:00') })));
  assert.ok(validateBusinessHours(schedule({ mon: open('10:00', '10:00') })));
  assert.ok(validateBusinessHours(schedule({}, 'Invalid/Zone')));
  assert.equal(formatDayHours(undefined), '情報なし');
});
const shop = (id, overrides = {}) => ({ id, name: id, lat: 35.66, lng: 139.70, ...overrides });
test('related ranking uses style then brands/area, excludes current, duplicates and invalid records', () => {
  const current = shop('current', { genre: '古着', brands: 'CELINE, Comme des Garcons', area: '渋谷' });
  const candidates = [current, shop('genre', { genre: '古着', lat: 36 }), shop('brand', { brands: 'celine', lat: 36 }), shop('area', { area: '渋谷', lat: 36 }), shop('genre', { genre: '古着' }), shop('invalid', { name: '' }), shop('badCoords', { lat: NaN }), shop('unrelated', { lat: 45 })];
  assert.deepEqual(relatedShops(current, candidates).map(s => s.id), ['genre', 'brand', 'area']);
  assert.deepEqual(relatedShops(current, []), []);
  assert.deepEqual(relatedShops(current, candidates, 1).map(s => s.id), ['genre']);
});
test('brand affinity preserves multiword names and ordering is deterministic', () => {
  const current = shop('current', { brands: 'Comme des Garcons', lat: 36 });
  assert.deepEqual(relatedShops(current, [shop('z', { brands: 'Comme des Garcons' }), shop('a', { brands: 'Comme des Garcons' }), shop('wrong', { brands: 'Comme X' })]).map(s => s.id), ['a', 'z']);
});
