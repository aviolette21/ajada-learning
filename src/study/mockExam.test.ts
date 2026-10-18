import { describe, expect, it } from 'vitest';
import domainsJson from '../../content/domains.json';
import { fixtureContent, manyQuestionsContent, multiQuestion } from '../content/fixtures';
import { QuestionSchema } from '../content/schema';
import { buildContent } from '../content/validate';
import { allocate, buildMockExam, MOCK_DURATION_MS, mockAttempts, scoreMock, subSkillWeights } from './mockExam';
import { mulberry32 } from './random';
import type { Attempt, MockSession } from './types';

describe('allocate', () => {
  it('splits 53 questions across the real exam weights', () => {
    const alloc = allocate(domainsJson, 53);
    expect(Object.fromEntries(alloc)).toEqual({
      'apps-integration': 17, 'model-selection': 9, 'agents-workflows': 8, 'prompt-context': 6,
      'tools-mcp': 6, 'security-safety': 4, 'claude-code': 2, 'eval-testing': 1,
    });
  });
  it('gives every domain at least one question when possible', () => {
    const alloc = allocate([{ id: 'a', weight: 98 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }], 10);
    expect(Object.fromEntries(alloc)).toEqual({ a: 8, b: 1, c: 1 });
  });
  it('never exceeds the total when there are more domains than questions', () => {
    const alloc = allocate([{ id: 'a', weight: 50 }, { id: 'b', weight: 30 }, { id: 'c', weight: 20 }], 2);
    expect([...alloc.values()].reduce((s, n) => s + n, 0)).toBe(2);
  });
});

describe('buildMockExam', () => {
  it('uses the whole bank when it is smaller than 53', () => {
    const c = fixtureContent();
    const s = buildMockExam({ id: 'm1', domains: c.domains, questions: c.questions, attempts: [], rng: mulberry32(1), now: 1000 });
    expect([...s.questionIds].sort()).toEqual(['q-alpha-1', 'q-alpha-2', 'q-alpha-3', 'q-beta-1']);
    expect(s).toMatchObject({ id: 'm1', startedAt: 1000, durationMs: MOCK_DURATION_MS, answers: {}, flagged: [], currentIndex: 0 });
  });

  it('builds 53 questions, refilling a short domain from the others, preferring unseen', () => {
    const c = manyQuestionsContent(60, 10);
    const attempts: Attempt[] = Array.from({ length: 20 }, (_, i) => ({
      questionId: `q-alpha-gen-${i}`, chosen: 'a', correct: true, mode: 'quiz', at: i,
    }));
    const s = buildMockExam({ id: 'm2', domains: c.domains, questions: c.questions, attempts, rng: mulberry32(2), now: 0 });
    expect(s.questionIds).toHaveLength(53);
    expect(new Set(s.questionIds).size).toBe(53);
    expect(s.questionIds.filter((id) => id.startsWith('q-beta')).length).toBe(10);
    for (let i = 20; i < 60; i++) expect(s.questionIds).toContain(`q-alpha-gen-${i}`);
  });

  it('weights sub-skills like the exam, not like the bank', () => {
    const base = fixtureContent();
    const domains = [{ ...base.domains[0], weight: 100, subSkills: [
      { id: 'big', name: 'Big', weight: 75, official: true }, { id: 'small', name: 'Small', weight: 25, official: true },
    ] }];
    const q = base.questionById.get('q-alpha-1')!;
    const questions = [
      ...Array.from({ length: 40 }, (_, i) => ({ ...q, id: `q-big-${i}`, subSkillId: 'big' })),
      ...Array.from({ length: 40 }, (_, i) => ({ ...q, id: `q-small-${i}`, subSkillId: 'small' })),
    ];
    const c = buildContent(domains, questions, base.cards, []);
    const s = buildMockExam({ id: 'm3', domains: c.domains, questions: c.questions, attempts: [], rng: mulberry32(3), now: 0 });
    expect(s.questionIds.filter((id) => id.startsWith('q-big-'))).toHaveLength(40);
    expect(s.questionIds.filter((id) => id.startsWith('q-small-'))).toHaveLength(13);
  });

  it('shares a domain weight among sub-skills without one', () => {
    expect(subSkillWeights(fixtureContent().domains)).toEqual([
      { id: 'a1', domainId: 'alpha', weight: 60 }, { id: 'b1', domainId: 'beta', weight: 40 },
    ]);
    expect(subSkillWeights(domainsJson as never).reduce((s, x) => s + x.weight, 0)).toBeCloseTo(100, 0);
  });
});

describe('scoring', () => {
  const c = fixtureContent();
  const session: MockSession = {
    id: 'm3', startedAt: 0, durationMs: MOCK_DURATION_MS,
    questionIds: ['q-alpha-1', 'q-alpha-2', 'q-alpha-3', 'q-beta-1'],
    answers: { 'q-alpha-1': 'a', 'q-alpha-2': 'a', 'q-beta-1': 'a', 'q-alpha-3': 'c' },
    flagged: [], currentIndex: 3,
  };

  it('scores overall and per domain; unanswered counts as wrong', () => {
    expect(scoreMock(session, c.questionById, c.domains)).toEqual({
      correct: 3, total: 4, percent: 75, scaledScore: 775, passes: true,
      byDomain: [{ domainId: 'alpha', correct: 2, total: 3 }, { domainId: 'beta', correct: 1, total: 1 }],
    });
    const blank = { ...session, answers: {} };
    expect(scoreMock(blank, c.questionById, c.domains)).toMatchObject({ correct: 0, scaledScore: 100, passes: false });
  });

  it('turns answered questions into mock attempts', () => {
    const partial = { ...session, answers: { 'q-alpha-1': 'a' as const, 'q-alpha-3': 'c' as const } };
    expect(mockAttempts(partial, c.questionById, 99)).toEqual([
      { questionId: 'q-alpha-1', chosen: 'a', correct: true, mode: 'mock', at: 99 },
      { questionId: 'q-alpha-3', chosen: 'c', correct: false, mode: 'mock', at: 99 },
    ]);
  });
});

describe('multiple-response scoring', () => {
  it('scores a multiple-response item only when every pick is right', () => {
    const content = fixtureContent();
    const multi = QuestionSchema.parse(multiQuestion());
    const byId = new Map([...content.questionById, [multi.id, multi]]);
    const session: MockSession = {
      id: 's', startedAt: 0, durationMs: 1, flagged: [], currentIndex: 0,
      questionIds: ['q-alpha-1', multi.id],
      answers: { 'q-alpha-1': 'a', [multi.id]: ['b'] },
    };
    expect(scoreMock(session, byId, content.domains).correct).toBe(1);
    expect(scoreMock({ ...session, answers: { ...session.answers, [multi.id]: ['b', 'd'] } }, byId, content.domains).correct).toBe(2);
    expect(mockAttempts(session, byId, 5)).toMatchObject([{ correct: true }, { chosen: ['b'], correct: false }]);
  });
});
