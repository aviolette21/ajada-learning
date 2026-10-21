import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../content/fixtures';
import type { Question } from '../content/schema';
import { DOMAIN_QUIZ_SIZE, domainQuizStat, pickDomainQuiz } from './domainQuiz';
import type { Attempt } from './types';

const base = fixtureContent().questions[0];
const make = (id: string, domainId = base.domainId): Question => ({ ...base, id, domainId });
const own = Array.from({ length: 30 }, (_, i) => make(`q-dq-alpha-${i}`));
const others = Array.from({ length: 10 }, (_, i) => make(`q-alpha-extra-${i}`));
const elsewhere = make('q-dq-beta-0', 'beta');
const attempt = (questionId: string, correct: boolean, at: number): Attempt => ({ questionId, chosen: 'a', correct, mode: 'quiz', at });

describe('pickDomainQuiz', () => {
  it('draws only the domain’s own quiz questions when there are enough', () => {
    const picked = pickDomainQuiz({ questions: [...own, ...others, elsewhere], attempts: [], domainId: base.domainId, rng: Math.random });
    expect(picked).toHaveLength(DOMAIN_QUIZ_SIZE);
    expect(picked.every((q) => q.id.startsWith('q-dq-alpha-'))).toBe(true);
  });

  it('tops up from the rest of the domain when the quiz pool is short', () => {
    const picked = pickDomainQuiz({ questions: [...own.slice(0, 20), ...others, elsewhere], attempts: [], domainId: base.domainId, rng: Math.random });
    expect(picked).toHaveLength(DOMAIN_QUIZ_SIZE);
    expect(picked.filter((q) => q.id.startsWith('q-dq-alpha-'))).toHaveLength(20);
    expect(picked.some((q) => q.id === elsewhere.id)).toBe(false);
  });
});

describe('domainQuizStat', () => {
  it('counts the latest answer to each quiz question', () => {
    const attempts = [attempt('q-dq-alpha-0', false, 1), attempt('q-dq-alpha-0', true, 2), attempt('q-dq-alpha-1', false, 3), attempt('q-alpha-extra-0', true, 4)];
    expect(domainQuizStat([...own, ...others], attempts, base.domainId)).toEqual({ total: 30, seen: 2, right: 1 });
  });
});
