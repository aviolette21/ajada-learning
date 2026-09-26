import type { Domain, Question } from '../content/schema';
import { accuracyBy } from './accuracy';
import type { Attempt } from './types';

export const PASS_SCORE = 720;
export const MIN_ANSWERS_FOR_ESTIMATE = 40;

export function toScaledScore(fraction: number): number {
  return Math.round(100 + 900 * fraction);
}

export type Readiness =
  | { available: false; answered: number; needed: number }
  | { available: true; answered: number; percent: number; score: number; passes: boolean };

export function readiness(
  domains: Domain[],
  attempts: Attempt[],
  questionById: Map<string, Question>,
  minAnswers = MIN_ANSWERS_FOR_ESTIMATE,
): Readiness {
  const answered = new Set(attempts.filter((a) => questionById.has(a.questionId)).map((a) => a.questionId)).size;
  if (answered < minAnswers) return { available: false, answered, needed: minAnswers };
  const byDomain = accuracyBy(attempts, questionById, 'domainId');
  const totalWeight = domains.reduce((s, d) => s + d.weight, 0);
  const fraction = domains.reduce((s, d) => s + (byDomain.get(d.id)?.accuracy ?? 0) * d.weight, 0) / totalWeight;
  const score = toScaledScore(fraction);
  return { available: true, answered, percent: Math.round(fraction * 100), score, passes: score >= PASS_SCORE };
}
