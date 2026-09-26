import { describe, expect, it } from 'vitest';
import { mulberry32 } from './random';
import {
  buildQueue, formatInterval, localDay, newState, nextDueIn, previewIntervals, rate, resurface, shouldRequeue, stateKey,
} from './scheduler';
import type { Direction, StoredCardState } from './types';

const NOW = new Date('2026-09-26T10:00:00');
const DAY = 86_400_000;
const PAST = new Date('2026-09-01T10:00:00');

function reviewed(cardId: string, direction: Direction, dueOffsetMs: number, introducedOn = '2026-09-01'): StoredCardState {
  const s = rate(newState(cardId, direction, PAST), 'easy', PAST);
  return { ...s, introducedOn, fsrs: { ...s.fsrs, due: new Date(NOW.getTime() + dueOffsetMs) } };
}
const mapOf = (...states: StoredCardState[]) => new Map(states.map((s) => [s.key, s]));

describe('formatInterval', () => {
  it.each([
    [30_000, '<1m'], [60_000, '1m'], [600_000, '10m'], [3 * 3_600_000, '3h'],
    [DAY, '1d'], [4 * DAY, '4d'], [60 * DAY, '2mo'], [400 * DAY, '1.1y'],
  ])('%i ms → %s', (ms, label) => {
    expect(formatInterval(ms)).toBe(label);
  });
});

describe('card state', () => {
  it('keys states by card and direction', () => {
    expect(stateKey('c-x', 'reverse')).toBe('c-x:reverse');
  });

  it('creates a new state that is due now and introduced today', () => {
    const s = newState('c-x', 'forward', NOW);
    expect(s.key).toBe('c-x:forward');
    expect(s.fsrs.due.getTime()).toBeLessThanOrEqual(NOW.getTime());
    expect(s.introducedOn).toBe(localDay(NOW));
  });

  it('schedules again < good < easy, with easy at least a day out', () => {
    const s = newState('c-x', 'forward', NOW);
    const due = (r: 'again' | 'good' | 'easy') => rate(s, r, NOW).fsrs.due.getTime();
    expect(due('again')).toBeLessThan(due('good'));
    expect(due('good')).toBeLessThan(due('easy'));
    expect(due('easy') - NOW.getTime()).toBeGreaterThanOrEqual(DAY);
  });

  it('keeps introducedOn when rating', () => {
    const s = newState('c-x', 'forward', PAST);
    expect(rate(s, 'good', NOW).introducedOn).toBe(localDay(PAST));
  });

  it('requeues only cards that come back within the session window', () => {
    const s = newState('c-x', 'forward', NOW);
    expect(shouldRequeue(rate(s, 'again', NOW), NOW)).toBe(true);
    expect(shouldRequeue(rate(s, 'easy', NOW), NOW)).toBe(false);
  });

  it('previews an interval label for each rating', () => {
    const p = previewIntervals(newState('c-x', 'forward', NOW), NOW);
    expect(Object.keys(p).sort()).toEqual(['again', 'easy', 'good', 'hard']);
    expect(p.easy).toMatch(/d$/);
  });

  it('resurface makes a card due now without losing its history', () => {
    const s = reviewed('c-x', 'forward', 5 * DAY);
    const r = resurface(s, NOW);
    expect(r.fsrs.due.getTime()).toBe(NOW.getTime());
    expect(r.fsrs.reps).toBe(s.fsrs.reps);
  });

  it('nextDueIn reports the soonest future review', () => {
    expect(nextDueIn(mapOf(reviewed('c-a', 'forward', 2 * DAY), reviewed('c-b', 'forward', 5 * DAY)), NOW)).toBe('2d');
    expect(nextDueIn(new Map(), NOW)).toBeNull();
  });
});

describe('buildQueue', () => {
  const rng = mulberry32(1);
  const base = { now: NOW, newPerDay: 10, rng };

  it('puts due cards first (most overdue first), then new cards', () => {
    const states = mapOf(reviewed('c-a', 'forward', -DAY), reviewed('c-b', 'forward', -3 * DAY), reviewed('c-c', 'forward', DAY));
    const q = buildQueue({ ...base, cardIds: ['c-a', 'c-b', 'c-c', 'c-d'], states, mode: 'forward' });
    expect(q.map((i) => i.cardId)).toEqual(['c-b', 'c-a', 'c-d']);
    expect(q[2].state).toBeNull();
  });

  it('limits new cards by what was already introduced today', () => {
    const states = mapOf(reviewed('c-a', 'forward', DAY, localDay(NOW)));
    const q = buildQueue({ ...base, newPerDay: 2, cardIds: ['c-a', 'c-b', 'c-c', 'c-d'], states, mode: 'forward' });
    expect(q.map((i) => i.cardId)).toEqual(['c-b']);
  });

  it('ignores reverse-direction states in forward mode', () => {
    const q = buildQueue({ ...base, cardIds: ['c-a'], states: mapOf(reviewed('c-a', 'reverse', -DAY)), mode: 'forward' });
    expect(q).toEqual([{ cardId: 'c-a', direction: 'forward', state: null }]);
  });

  it('schedules the reverse direction independently of the forward one', () => {
    const q = buildQueue({ ...base, cardIds: ['c-a'], states: mapOf(reviewed('c-a', 'forward', -DAY)), mode: 'reverse' });
    expect(q).toEqual([{ cardId: 'c-a', direction: 'reverse', state: null }]);
  });

  it('mixed mode introduces one direction per new card', () => {
    const q = buildQueue({ ...base, cardIds: ['c-a', 'c-b', 'c-c'], states: new Map(), mode: 'mixed' });
    expect(q).toHaveLength(3);
    expect(new Set(q.map((i) => i.cardId)).size).toBe(3);
  });

  it('mixed mode waits a day before introducing the second direction', () => {
    const today = mapOf(reviewed('c-a', 'forward', DAY, localDay(NOW)));
    expect(buildQueue({ ...base, cardIds: ['c-a'], states: today, mode: 'mixed' })).toEqual([]);
    const earlier = mapOf(reviewed('c-a', 'forward', DAY, '2026-09-01'));
    expect(buildQueue({ ...base, cardIds: ['c-a'], states: earlier, mode: 'mixed' })).toEqual([
      { cardId: 'c-a', direction: 'reverse', state: null },
    ]);
  });
});
