import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../content/fixtures';
import type { Question } from '../content/schema';
import { lessonPool, pickRotating } from './quiz';
import { mulberry32 } from './random';
import type { Attempt } from './types';

const base = fixtureContent().questionById.get('q-alpha-1')!;
const qs = (prefix: string, n: number): Question[] => Array.from({ length: n }, (_, i) => ({ ...base, id: `q-${prefix}-${i}` }));
const seen = (ids: string[], at: number): Attempt[] => ids.map((questionId, i) => ({ questionId, chosen: 'a', correct: true, mode: 'lesson', at: at + i }));

describe('pickRotating', () => {
  it('fills from the fallback only when the primary pool runs short', () => {
    const picked = pickRotating({ primary: qs('own', 4), fallback: qs('wide', 20), attempts: [], count: 10, rng: mulberry32(1) });
    expect(picked).toHaveLength(10);
    expect(picked.filter((q) => q.id.startsWith('q-own'))).toHaveLength(4);
  });
  it('never repeats a question that is in both pools', () => {
    const own = qs('own', 4);
    const picked = pickRotating({ primary: own, fallback: [...own, ...qs('wide', 3)], attempts: [], count: 10, rng: mulberry32(2) });
    expect(new Set(picked.map((q) => q.id)).size).toBe(picked.length);
    expect(picked).toHaveLength(7);
  });
  it('brings unseen questions first, then the ones seen longest ago, so retakes differ', () => {
    const pool = qs('own', 15);
    const first = pickRotating({ primary: pool, attempts: [], count: 10, rng: mulberry32(3) }).map((q) => q.id);
    const second = pickRotating({ primary: pool, attempts: seen(first, 1000), count: 10, rng: mulberry32(4) }).map((q) => q.id);
    const unseen = pool.map((q) => q.id).filter((id) => !first.includes(id));
    expect(second).toEqual(expect.arrayContaining(unseen));
    // The other five are the oldest of the first run.
    expect(second.filter((id) => first.includes(id)).sort()).toEqual(first.slice(0, 5).sort());
  });
});

describe('lessonPool', () => {
  it('treats linked and check questions as the lesson’s own and the sub-skill as fallback', () => {
    const content = fixtureContent();
    const { primary, fallback } = lessonPool(content.lessonById.get('l-alpha')!, content.questions);
    expect(primary.map((q) => q.id).sort()).toEqual(['q-alpha-1', 'q-alpha-2', 'q-alpha-3']);
    expect(fallback.every((q) => q.subSkillId === 'a1')).toBe(true);
  });
});
