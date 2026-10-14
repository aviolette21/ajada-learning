import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../content/fixtures';
import { accuracyBy, estimateAccuracy } from './accuracy';
import { pickQuizQuestions } from './quiz';
import { mulberry32 } from './random';
import { PASS_FRACTION, readiness, scoreStatus, toScaledScore } from './readiness';
import type { Attempt } from './types';
import { missedQuestionIds, pickWeakQuestions, weakSubSkills } from './weakSpots';

const { domains, questions, questionById } = fixtureContent();
const att = (questionId: string, correct: boolean, at: number): Attempt => ({
  questionId, chosen: correct ? 'a' : 'b', correct, mode: 'quiz', at,
});

describe('estimateAccuracy', () => {
  const many = (n: number, right: number) => Array.from({ length: n }, (_, i) => att(`q-${i}`, i < right, i));
  it('is null without attempts', () => expect(estimateAccuracy([])).toBeNull());
  it('starts near 50% and needs many answers to approach 100%', () => {
    expect(estimateAccuracy(many(3, 3))).toBeCloseTo(8 / 13, 5); // 62%
    expect(estimateAccuracy(many(10, 10))).toBe(0.75);
    expect(estimateAccuracy(many(30, 24))).toBeCloseTo(29 / 40, 5); // 72.5%
  });
  it('uses the latest answer to each question', () => {
    expect(estimateAccuracy([att('q-alpha-1', false, 1), att('q-alpha-1', true, 2)])).toBeCloseTo(6 / 11, 5);
  });
});

describe('accuracyBy', () => {
  it('groups by domain and ignores unknown questions', () => {
    const stats = accuracyBy(
      [att('q-alpha-1', true, 1), att('q-alpha-2', false, 2), att('q-beta-1', true, 3), att('q-gone', true, 4)],
      questionById,
      'domainId',
    );
    expect(stats.get('alpha')).toMatchObject({ total: 2, correct: 1 });
    expect(stats.get('beta')).toMatchObject({ total: 1, correct: 1, answered: 1, accuracy: 6 / 11 });
    expect(stats.size).toBe(2);
  });
});

describe('readiness', () => {
  it('is unavailable until enough distinct questions are answered', () => {
    expect(readiness(domains, [att('q-alpha-1', true, 1), att('q-alpha-1', true, 2)], questionById)).toEqual({
      available: false, answered: 1, needed: 40,
    });
  });
  it('weights domain estimates by exam weight; unanswered domains count as zero', () => {
    const r = readiness(domains, [att('q-alpha-1', true, 1)], questionById, 1);
    const fraction = (6 / 11) * 0.6;
    expect(r).toEqual({ available: true, answered: 1, percent: Math.round(fraction * 100), score: toScaledScore(fraction), passes: false });
  });
  it('does not call a pass from a couple of right answers', () => {
    const r = readiness(domains, [att('q-alpha-1', true, 1), att('q-beta-1', true, 2)], questionById, 1);
    expect(r).toMatchObject({ percent: 55, passes: false });
  });
  it('maps fractions onto 100–1000', () => {
    expect(toScaledScore(0)).toBe(100);
    expect(toScaledScore(0.7)).toBe(730);
  });
});

describe('weak spots', () => {
  const attempts = [
    att('q-alpha-1', false, 1), att('q-alpha-1', true, 2),
    att('q-alpha-2', false, 3), att('q-alpha-3', false, 4), att('q-beta-1', true, 5),
  ];
  it('keeps missed questions in the pile, most recently missed first, until mastered', () => {
    // q-alpha-1 was answered right once since its miss, which is not yet two different days.
    expect(missedQuestionIds(attempts)).toEqual(['q-alpha-3', 'q-alpha-2', 'q-alpha-1']);
  });
  it('clears a question after sure, right answers on two different days', () => {
    const DAY = 86_400_000;
    const sameDay = [att('q-alpha-1', false, 0), att('q-alpha-1', true, 1000), att('q-alpha-1', true, 2000)];
    expect(missedQuestionIds(sameDay)).toEqual(['q-alpha-1']);
    expect(missedQuestionIds([...sameDay, att('q-alpha-1', true, 2 * DAY)])).toEqual([]);
  });
  it('treats a right answer marked as a guess as a miss, and gives it half credit', () => {
    const guess = { ...att('q-alpha-1', true, 5), confident: false };
    expect(missedQuestionIds([guess])).toEqual(['q-alpha-1']);
    expect(estimateAccuracy([guess])).toBeCloseTo(5.5 / 11, 5);
  });
  it('ranks sub-skills from weakest', () => {
    expect(weakSubSkills(attempts, questionById)).toEqual(['a1', 'b1']);
  });
  it('picks missed questions first and never repeats', () => {
    const picked = pickWeakQuestions({ attempts, questions, questionById, count: 3, rng: mulberry32(3) });
    expect(picked.slice(0, 2).map((q) => q.id)).toEqual(['q-alpha-3', 'q-alpha-2']);
    expect(new Set(picked.map((q) => q.id)).size).toBe(3);
  });
  it('falls back to unseen questions when there is no history', () => {
    expect(pickWeakQuestions({ attempts: [], questions, questionById, count: 10, rng: mulberry32(3) })).toHaveLength(4);
  });
});

describe('pickQuizQuestions', () => {
  it('filters by domain and puts unseen questions first', () => {
    const picked = pickQuizQuestions({
      questions, attempts: [att('q-alpha-1', true, 1)], domainIds: ['alpha'], count: 10, rng: mulberry32(9),
    });
    expect(picked.map((q) => q.domainId)).toEqual(['alpha', 'alpha', 'alpha']);
    expect(picked[2].id).toBe('q-alpha-1');
  });
  it('uses every domain when none are selected', () => {
    expect(pickQuizQuestions({ questions, attempts: [], domainIds: [], count: 2, rng: mulberry32(9) })).toHaveLength(2);
  });
});

describe('scoreStatus', () => {
  it('places accuracy against the pass line', () => {
    expect(PASS_FRACTION).toBeCloseTo(0.689, 3);
    expect(scoreStatus(null)).toBe('not-started');
    expect(scoreStatus(0.7)).toBe('on-track');
    expect(scoreStatus(0.6)).toBe('close');
    expect(scoreStatus(0.5)).toBe('needs-work');
    expect(scoreStatus(0.9, 4)).toBe('early');
  });
});
