import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../src/content/fixtures';
import { coverage, coverageGaps } from './coverage';

const targets = {
  a1: { domainId: 'alpha', questions: 3, cards: 2 },
  b1: { domainId: 'beta', questions: 2, cards: 1 },
};

describe('coverage', () => {
  it('counts items per sub-skill against targets', () => {
    expect(coverage(fixtureContent(), targets)).toEqual([
      { domainId: 'alpha', subSkillId: 'a1', questions: 3, cards: 1, lessons: 1, targetQuestions: 3, targetCards: 2 },
      { domainId: 'beta', subSkillId: 'b1', questions: 1, cards: 1, lessons: 0, targetQuestions: 2, targetCards: 1 },
    ]);
  });
  it('lists every shortfall', () => {
    expect(coverageGaps(coverage(fixtureContent(), targets))).toEqual([
      'alpha/a1: cards 1/2',
      'beta/b1: questions 1/2',
      'beta/b1: no lesson',
    ]);
  });
});
