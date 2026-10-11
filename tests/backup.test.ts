import { describe, expect, it } from 'vitest';
import { BACKUP_APP, BACKUP_VERSION, createBackup, parseBackup } from '../src/lib/backup';
import { todayStr } from '../src/lib/dates';

const day = todayStr();

function sampleData() {
  return {
    progress: { [day]: { 'leg-press': 2 } },
    weights: [{ id: 'w-1', date: day, weight: 80.5 }],
    exWeights: { 'leg-press': [{ date: day, weight: 120 }] },
  };
}

describe('createBackup / parseBackup (v2)', () => {
  it('round-trips all three data sets', () => {
    const json = createBackup(sampleData(), new Date('2026-01-01T00:00:00Z'));
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.progress).toEqual(sampleData().progress);
      expect(parsed.data.weights).toEqual(sampleData().weights);
      expect(parsed.data.exWeights).toEqual(sampleData().exWeights);
    }
  });

  it('writes the versioned envelope', () => {
    const json = JSON.parse(createBackup(sampleData()));
    expect(json.app).toBe(BACKUP_APP);
    expect(json.v).toBe(BACKUP_VERSION);
    expect(BACKUP_VERSION).toBe(2);
    expect(typeof json.exportedAt).toBe('string');
  });

  it('rejects invalid JSON and non-envelope shapes', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'Файл не є коректним JSON' });
    expect(parseBackup('[1,2,3]').ok).toBe(false);
    expect(parseBackup('"text"').ok).toBe(false);
  });

  it('rejects foreign files and unsupported versions', () => {
    expect(parseBackup(JSON.stringify({ app: 'other-app', v: 2, data: {} })).ok).toBe(false);
    const wrongVersion = JSON.parse(createBackup(sampleData()));
    wrongVersion.v = 99;
    const res = parseBackup(JSON.stringify(wrongVersion));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('версія');
  });

  it('rejects missing or broken data sections', () => {
    expect(parseBackup(JSON.stringify({ app: BACKUP_APP, v: 2 })).ok).toBe(false);
    expect(
      parseBackup(
        JSON.stringify({ app: BACKUP_APP, v: 2, data: { progress: 'nope', weights: [], exWeights: {} } }),
      ).ok,
    ).toBe(false);
  });

  it('sanitizes entries on import (same guards as localStorage)', () => {
    const json = JSON.stringify({
      app: BACKUP_APP,
      v: 2,
      exportedAt: '2026-01-01T00:00:00Z',
      data: {
        progress: {
          [day]: { 'leg-press': true, 'deleted-exercise': true, burpee: 99 },
          'not-a-date': { 'leg-press': true },
          '2024-02-30': { 'leg-press': true },
        },
        weights: [
          { id: 'keep', date: day, weight: 80 },
          { id: 'drop', date: day, weight: 1000 },
          { id: 'drop2', date: '2024-02-30', weight: 80 },
        ],
        exWeights: {
          'leg-press': [
            { date: day, weight: 120 },
            { date: day, weight: 121, extra: 1 },
          ],
          hacker: [{ date: day, weight: 10 }],
        },
      },
    });
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(Object.keys(parsed.data.progress)).toEqual([day]);
      expect(parsed.data.progress[day]).toEqual({ 'leg-press': 3, burpee: 3 });
      expect(parsed.data.weights).toEqual([{ id: 'keep', date: day, weight: 80 }]);
      expect(parsed.data.exWeights).toEqual({ 'leg-press': [{ date: day, weight: 120 }] });
    }
  });
});

describe('parseBackup v1 compatibility', () => {
  it('converts the legacy exWeights map, dating points by exportedAt', () => {
    const v1 = JSON.stringify({
      app: BACKUP_APP,
      v: 1,
      exportedAt: '2026-01-01T12:00:00Z',
      data: {
        progress: { [day]: { 'leg-press': true } },
        weights: [],
        exWeights: { 'leg-press': 120, 'burpee': 10 },
      },
    });
    const parsed = parseBackup(v1);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.progress).toEqual({ [day]: { 'leg-press': 3 } });
      expect(parsed.data.exWeights).toEqual({
        'leg-press': [{ date: '2026-01-01', weight: 120 }],
        'burpee': [{ date: '2026-01-01', weight: 10 }],
      });
    }
  });

  it('falls back to today when exportedAt is missing or broken', () => {
    const v1 = JSON.stringify({
      app: BACKUP_APP,
      v: 1,
      data: { progress: {}, weights: [], exWeights: { 'leg-press': 100 } },
    });
    const parsed = parseBackup(v1);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.exWeights).toEqual({ 'leg-press': [{ date: day, weight: 100 }] });
    }
  });
});
