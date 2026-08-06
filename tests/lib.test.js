const test = require('node:test');
const assert = require('node:assert');
const lib = require('../lib.js');

test('localDateStr uses local time, no UTC shift', () => {
  assert.strictEqual(lib.localDateStr(new Date(2024, 0, 5)), '2024-01-05');
  assert.strictEqual(lib.localDateStr(new Date(2024, 11, 31)), '2024-12-31');
  assert.strictEqual(lib.localDateStr(new Date(2024, 2, 7)), '2024-03-07');
});

test('todayStr returns YYYY-MM-DD matching local date', () => {
  const d = new Date();
  const expected =
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
  assert.strictEqual(lib.todayStr(), expected);
});

test('formatDate produces a non-empty localized string', () => {
  const s = lib.formatDate('2024-03-05');
  assert.strictEqual(typeof s, 'string');
  assert.ok(s.length > 0);
});

test('formatDateLabel distinguishes today/yesterday/other', () => {
  assert.strictEqual(lib.formatDateLabel(lib.todayStr()), 'Сьогодні');
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yStr = lib.localDateStr(y);
  assert.strictEqual(lib.formatDateLabel(yStr), 'Вчора');
  const other = lib.formatDateLabel('2020-01-01');
  assert.notStrictEqual(other, 'Сьогодні');
  assert.notStrictEqual(other, 'Вчора');
});

test('toWeight accepts comma decimals and plain numbers', () => {
  assert.strictEqual(lib.toWeight('0,5'), 0.5);
  assert.strictEqual(lib.toWeight('12'), 12);
  assert.strictEqual(lib.toWeight(' 80.5 '), 80.5);
  assert.strictEqual(lib.toWeight('2.25'), 2.3);
});

test('toWeight rejects garbage, negatives, zero, empty', () => {
  assert.strictEqual(lib.toWeight('12abc'), null);
  assert.strictEqual(lib.toWeight(''), null);
  assert.strictEqual(lib.toWeight('   '), null);
  assert.strictEqual(lib.toWeight('-3'), null);
  assert.strictEqual(lib.toWeight('0'), null);
  assert.strictEqual(lib.toWeight('abc'), null);
  assert.strictEqual(lib.toWeight(null), null);
  assert.strictEqual(lib.toWeight(undefined), null);
  assert.strictEqual(lib.toWeight(NaN), null);
});

test('escapeHtml neutralizes markup', () => {
  assert.strictEqual(lib.escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.strictEqual(lib.escapeHtml('"onload="x'), '&quot;onload=&quot;x');
  assert.strictEqual(lib.escapeHtml("it's"), 'it&#39;s');
  assert.strictEqual(lib.escapeHtml('a&b'), 'a&amp;b');
});

test('isValidDateEntry', () => {
  assert.strictEqual(lib.isValidDateEntry({ 'leg-press': true }), true);
  assert.strictEqual(lib.isValidDateEntry({}), false);
  assert.strictEqual(lib.isValidDateEntry(null), false);
  assert.strictEqual(lib.isValidDateEntry(undefined), false);
  assert.strictEqual(lib.isValidDateEntry('x'), false);
  assert.strictEqual(lib.isValidDateEntry(42), false);
});

test('computeWeightDiffs uses chronological neighbor, not insertion order', () => {
  const sorted = [
    { id: 3, date: '2024-03-03', weight: 80 },
    { id: 1, date: '2024-03-01', weight: 82 },
    { id: 2, date: '2024-02-25', weight: 84 }
  ];
  assert.deepStrictEqual(lib.computeWeightDiffs(sorted), [-2, -2, null]);
});

test('computeWeightDiffs handles empty and single-entry lists', () => {
  assert.deepStrictEqual(lib.computeWeightDiffs([]), []);
  assert.deepStrictEqual(lib.computeWeightDiffs([{ id: 1, weight: 80 }]), [null]);
});

test('computeWeightDiffs rounds to one decimal', () => {
  const sorted = [
    { weight: 80.1 },
    { weight: 80 }
  ];
  assert.deepStrictEqual(lib.computeWeightDiffs(sorted), [0.1, null]);
});
