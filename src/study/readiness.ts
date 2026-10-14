import type { Domain, Question } from '../content/schema';
import { accuracyBy } from './accuracy';
import type { Attempt } from './types';

export const PASS_SCORE = 720;
export const MIN_ANSWERS_FOR_ESTIMATE = 40;

/** The share of questions right that maps to the 720 pass mark (≈ 69%). */
export const PASS_FRACTION = (PASS_SCORE - 100) / 900;
/** How far below the pass line still counts as "close". */
export const CLOSE_MARGIN = 0.15;

/** Below this many answered questions an area shows "early estimate" instead of a verdict. */
export const MIN_ANSWERS_FOR_STATUS = 10;

export type ScoreStatus = 'on-track' | 'close' | 'needs-work' | 'early' | 'not-started';
export const STATUS_LABEL: Record<ScoreStatus, string> = {
  'on-track': 'on track', close: 'close', 'needs-work': 'needs work', early: 'early estimate', 'not-started': 'not started',
};

/** Where an accuracy sits against the pass line; "early" until enough questions back it up. */
export function scoreStatus(accuracy: number | null, answered = Infinity): ScoreStatus {
  if (accuracy === null) return 'not-started';
  if (answered < MIN_ANSWERS_FOR_STATUS) return 'early';
  if (accuracy >= PASS_FRACTION) return 'on-track';
  return accuracy >= PASS_FRACTION - CLOSE_MARGIN ? 'close' : 'needs-work';
}

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
