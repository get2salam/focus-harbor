import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  daysFromToday,
  normalize,
  priority,
  todayISO,
} from '../js/scoring.js';

const SPEC = {
  slug: 'focus-harbor',
  itemLabel: 'focus session',
  categories: ['Deep work', 'Admin', 'Learning', 'Recovery'],
  states: ['Planned', 'Anchored', 'Drifting', 'Logged'],
  completedStates: ['Logged'],
  stateWeights: { Planned: 2, Anchored: 10, Drifting: 7, Logged: 3 },
  metric: { label: 'Focus quality', min: 1, max: 10, default: 6 },
  textOne: { label: 'Goal', default: 'What this session must achieve' },
  textTwo: { label: 'Distraction', default: 'What will try to break focus' },
  date: { label: 'Session date' },
  defaults: { note: 'Capture the setup that makes this block easier to protect.' },
};

const baseItem = (overrides = {}) => ({
  id: 'session-base',
  title: 'Sample',
  note: 'note',
  category: 'Deep work',
  state: 'Anchored',
  score: 7,
  effort: 3,
  metric: 6,
  textOne: 'goal',
  textTwo: 'distraction',
  date: todayISO(),
  ...overrides,
});

describe('clamp', () => {
  it('keeps in-range numbers untouched', () => {
    assert.equal(clamp(5, 1, 10), 5);
    assert.equal(clamp(1, 1, 10), 1);
    assert.equal(clamp(10, 1, 10), 10);
  });

  it('clamps to the bounds when outside the range', () => {
    assert.equal(clamp(-3, 1, 10), 1);
    assert.equal(clamp(99, 1, 10), 10);
  });

  it('falls back when the value is not a finite number', () => {
    // Regression: imported backups with `"score": "oops"` previously
    // produced NaN, which then poisoned priority math and broke the UI.
    assert.equal(clamp('oops', 1, 10, 7), 7);
    assert.equal(clamp(NaN, 1, 10, 7), 7);
    assert.equal(clamp(Infinity, 1, 10, 7), 7);
  });

  it('uses the fallback for nullish inputs without coercing null to zero', () => {
    assert.equal(clamp(null, 1, 10, 7), 7);
    assert.equal(clamp(undefined, 1, 10, 7), 7);
  });

  it('still coerces numeric strings the way callers expect', () => {
    assert.equal(clamp('4', 1, 10, 7), 4);
  });
});

describe('daysFromToday', () => {
  it('returns 0 for today and positive numbers for future dates', () => {
    const today = todayISO();
    assert.equal(daysFromToday(today, today), 0);
    assert.equal(daysFromToday(todayISO(3), today), 3);
  });

  it('returns negative numbers for overdue dates', () => {
    const today = todayISO();
    assert.equal(daysFromToday(todayISO(-2), today), -2);
  });

  it('returns Infinity for missing or malformed dates', () => {
    // Regression: an imported item with `"date": "not-a-date"` used to
    // return NaN, which poisoned sort comparators and priority scoring.
    assert.equal(daysFromToday(''), Infinity);
    assert.equal(daysFromToday(null), Infinity);
    assert.equal(daysFromToday('not-a-date'), Infinity);
  });
});

describe('priority', () => {
  it('ranks overdue sessions above identical sessions due today', () => {
    // Regression: the old `Math.max(daysFromToday, 0)` clipped overdue
    // days to zero, so a session due 3 days ago tied with one due today.
    const today = todayISO();
    const dueToday = baseItem({ id: 'a', date: today });
    const overdue = baseItem({ id: 'b', date: todayISO(-3) });
    assert.ok(
      priority(overdue, SPEC) > priority(dueToday, SPEC),
      `expected overdue priority ${priority(overdue, SPEC)} > due-today priority ${priority(dueToday, SPEC)}`,
    );
  });

  it('still drops the due-date boost once the session is logged', () => {
    const logged = baseItem({ state: 'Logged', date: todayISO(-5) });
    const planned = baseItem({ state: 'Planned', date: todayISO(-5) });
    // Logged items must not jump back to the top of the queue just
    // because they have a stale (past) date.
    assert.ok(priority(planned, SPEC) > priority(logged, SPEC));
  });

  it('returns a finite number even when the item date is malformed', () => {
    const broken = baseItem({ date: 'whenever' });
    const score = priority(broken, SPEC);
    assert.ok(Number.isFinite(score), `expected finite priority, got ${score}`);
  });
});

describe('normalize', () => {
  it('repairs malformed numeric fields instead of producing NaN', () => {
    const normalized = normalize({ score: 'oops', effort: null, metric: 'bad' }, SPEC);
    assert.equal(normalized.score, 7);
    assert.equal(normalized.effort, 3);
    assert.equal(normalized.metric, 6);
  });

  it('replaces malformed date strings with a sensible default', () => {
    const normalized = normalize({ date: 'not-a-real-date' }, SPEC);
    assert.equal(normalized.date, todayISO(3));
  });

  it('keeps a valid date untouched', () => {
    const future = todayISO(7);
    const normalized = normalize({ date: future }, SPEC);
    assert.equal(normalized.date, future);
  });

  it('falls back to the first valid category and state when given unknown values', () => {
    const normalized = normalize({ category: 'Unknown', state: 'Mystery' }, SPEC);
    assert.equal(normalized.category, 'Deep work');
    assert.equal(normalized.state, 'Planned');
  });

  it('uses a deterministic id factory when one is supplied', () => {
    const normalized = normalize({}, SPEC, { idFor: () => 'fixed-id' });
    assert.equal(normalized.id, 'fixed-id');
  });
});
