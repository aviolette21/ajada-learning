import { describe, expect, it } from 'vitest';
import { newState, rate } from '../study/scheduler';
import { firstActivityAt, needsBackupReminder } from './reminders';

const DAY = 86_400_000;
const NOW = new Date('2026-09-26T10:00:00');

describe('needsBackupReminder', () => {
  it('stays quiet with no activity', () => expect(needsBackupReminder({ now: NOW })).toBe(false));
  it('reminds 14 days after first activity when never backed up', () => {
    expect(needsBackupReminder({ firstActivityAt: NOW.getTime() - 13 * DAY, now: NOW })).toBe(false);
    expect(needsBackupReminder({ firstActivityAt: NOW.getTime() - 14 * DAY, now: NOW })).toBe(true);
  });
  it('counts from the last backup when there is one', () => {
    expect(needsBackupReminder({ lastBackupAt: NOW.getTime() - 2 * DAY, firstActivityAt: 0, now: NOW })).toBe(false);
  });
});

describe('firstActivityAt', () => {
  it('uses the earliest attempt or card review', () => {
    const reviewedAt = new Date(NOW.getTime() - 5 * DAY);
    const s = rate(newState('c-a', 'forward', reviewedAt), 'good', reviewedAt);
    expect(firstActivityAt([{ questionId: 'q', chosen: 'a', correct: true, mode: 'quiz', at: NOW.getTime() }], new Map([[s.key, s]])))
      .toBe(reviewedAt.getTime());
    expect(firstActivityAt([], new Map())).toBeUndefined();
  });
});

