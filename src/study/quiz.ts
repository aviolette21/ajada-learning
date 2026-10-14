import type { Question } from '../content/schema';
import { shuffle } from './random';
import type { Attempt } from './types';

export const QUIZ_SIZE = 10;
export const QUIZ_SIZES = [10, 20, 30] as const;

/** The quiz length from the ?n= search param: one of QUIZ_SIZES, else the default. */
export function quizSize(param: string | null): number {
  const n = Number(param);
  return (QUIZ_SIZES as readonly number[]).includes(n) ? n : QUIZ_SIZE;
}

export function pickQuizQuestions(args: {
  questions: Question[];
  attempts: Attempt[];
  domainIds: string[];
  /** Optional: limit to these sub-skills (overrides domainIds). */
  subSkillIds?: string[];
  count: number;
  rng: () => number;
}): Question[] {
  const { questions, attempts, domainIds, subSkillIds = [], count, rng } = args;
  const pool = subSkillIds.length > 0
    ? questions.filter((q) => subSkillIds.includes(q.subSkillId))
    : domainIds.length > 0 ? questions.filter((q) => domainIds.includes(q.domainId)) : questions;
  const seen = new Set(attempts.map((a) => a.questionId));
  return [
    ...shuffle(pool.filter((q) => !seen.has(q.id)), rng),
    ...shuffle(pool.filter((q) => seen.has(q.id)), rng),
  ].slice(0, count);
}
