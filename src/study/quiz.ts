import type { Question } from '../content/schema';
import { shuffle } from './random';
import type { Attempt } from './types';

export const QUIZ_SIZE = 10;

export function pickQuizQuestions(args: {
  questions: Question[];
  attempts: Attempt[];
  domainIds: string[];
  count: number;
  rng: () => number;
}): Question[] {
  const { questions, attempts, domainIds, count, rng } = args;
  const pool = domainIds.length > 0 ? questions.filter((q) => domainIds.includes(q.domainId)) : questions;
  const seen = new Set(attempts.map((a) => a.questionId));
  return [
    ...shuffle(pool.filter((q) => !seen.has(q.id)), rng),
    ...shuffle(pool.filter((q) => seen.has(q.id)), rng),
  ].slice(0, count);
}
