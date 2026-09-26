import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../content/fixtures';
import { accuracyBy, weightedAccuracy } from './accuracy';
import { pickQuizQuestions } from './quiz';
import { mulberry32 } from './random';
import { readiness, toScaledScore } from './readiness';
import type { Attempt } from './types';
import { missedQuestionIds, pickWeakQuestions, weakSubSkills } from './weakSpots';

const { domains, questions, questionById } = fixtureContent();
const att = (questionId: string, correct: boolean, at: number): Attempt => ({
  questionId, chosen: correct ? 'a' : 'b', correct, mode: 'quiz', at,
});

describe('weightedAccuracy', () => {
  it('is null without attempts', () => expect(weightedAccuracy([])).toBeNull());
  it('is 1 when everything is right', () => expect(weightedAccuracy([att('q-alpha-1', true, 1), att('q-alpha-2', true, 2)])).toBe(1));
  it('weighs recent attempts more', () => {
    expect(weightedAccuracy([att('q-alpha-1', false, 1), att('q-alpha-1', true, 2)])).toBeCloseTo(1 / 1.9, 5);
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
    expect(stats.get('beta')).toMatchObject({ total: 1, correct: 1, accuracy: 1 });
    expect(stats.size).toBe(2);
  });
});

describe('readiness', () => {
  it('is unavailable until enough distinct questions are answered', () => {
    expect(readiness(domains, [att('q-alpha-1', true, 1), att('q-alpha-1', true, 2)], questionById)).toEqual({
      available: false, answered: 1, needed: 40,
    });
  });
  it('weights domain accuracy by exam weight; unanswered domains count as zero', () => {
    const r = readiness(domains, [att('q-alpha-1', true, 1)], questionById, 1);
    expect(r).toEqual({ available: true, answered: 1, percent: 60, score: 640, passes: false });
  });
  it('passes at or above 720', () => {
    const r = readiness(domains, [att('q-alpha-1', true, 1), att('q-beta-1', true, 2)], questionById, 1);
    expect(r).toMatchObject({ score: 1000, passes: true });
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
  it('lists questions whose latest attempt was wrong, most recent first', () => {
    expect(missedQuestionIds(attempts)).toEqual(['q-alpha-3', 'q-alpha-2']);
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
